package com.xadazhii.backend.controller;

import com.xadazhii.backend.entity.Chat;
import com.xadazhii.backend.entity.ChatMessage;
import com.xadazhii.backend.service.AudioTranscriptionService;
import com.xadazhii.backend.service.ChatMessageService;
import com.xadazhii.backend.service.ChatService;
import com.xadazhii.backend.service.ImageDescriptionService;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.store.embedding.EmbeddingStoreIngestor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FileUploadController {

    private static final Logger log = LoggerFactory.getLogger(FileUploadController.class);

    private final EmbeddingStoreIngestor ingestor;
    private final ChatService chatService;
    private final ChatMessageService chatMessageService;
    private final Path uploadDir;

    private final AudioTranscriptionService audioService;
    private final ImageDescriptionService imageService;

    public FileUploadController(EmbeddingStoreIngestor ingestor,
                                ChatService chatService,
                                ChatMessageService chatMessageService,
                                @Value("${file.upload-dir}") String uploadDirStr,
                                AudioTranscriptionService audioService,
                                ImageDescriptionService imageService) {
        this.ingestor = ingestor;
        this.chatService = chatService;
        this.chatMessageService = chatMessageService;
        this.uploadDir = Paths.get(uploadDirStr);
        this.audioService = audioService;
        this.imageService = imageService;
    }

    @PostMapping("/upload/{chatid}")
    public ResponseEntity<Map<String, Object>> uploadFile(@PathVariable String chatid, @RequestParam("file") MultipartFile file) {
        log.info("📩 Received upload request for file [{}], type: {} (ChatID: {})", file.getOriginalFilename(), file.getContentType(), chatid);
        Map<String, Object> response = new HashMap<>();

        try {
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            String originalFilename = file.getOriginalFilename();
            String fileType = file.getContentType();
            byte[] fileBytes = file.getBytes();

            String extractedText;
            String sourceType;

            if (fileType != null && fileType.startsWith("image/")) {
                log.info("Type: Image. Running description service...");
                extractedText = imageService.describe(fileBytes);
                sourceType = "image";

            } else if (fileType != null && (fileType.startsWith("audio/") || fileType.startsWith("video/"))) {
                log.info("Type: Audio/Video. Attempting transcription...");
                try {
                    extractedText = audioService.transcribe(fileBytes, originalFilename);
                    sourceType = "audio_transcription";
                } catch (Exception e) {
                    log.warn("🎙️❌ Failed to transcribe, trying video frame analysis: {}", e.getMessage());
                    extractedText = imageService.describeVideo(fileBytes, originalFilename);
                    sourceType = "video_frames";
                }

            } else if (fileType != null && "application/pdf".equals(fileType)) {
                log.info("Type: PDF. Parsing with PDFBox...");
                try (PDDocument pd = PDDocument.load(new ByteArrayInputStream(fileBytes))) {
                    PDFTextStripper stripper = new PDFTextStripper();
                    String pdfText = stripper.getText(pd);
                    extractedText = (pdfText != null) ? pdfText : "";
                    sourceType = "pdf";
                }

            } else {
                log.info("Type: Text/Other ({}). Loading as plain text...", fileType);
                extractedText = new String(fileBytes, StandardCharsets.UTF_8);
                sourceType = "text_file";
            }

            if (extractedText == null || extractedText.trim().isEmpty()) {
                throw new RuntimeException("Extracted text is empty. Cannot ingest empty document.");
            }

            Document document = Document.from(extractedText);

            document.metadata().add("chatId", chatid);
            document.metadata().add("file_name", originalFilename);
            document.metadata().add("source_type", sourceType);

            log.info("🔍 Document Metadata before ingest: {}", document.metadata().asMap());

            ingestor.ingest(document);
            log.info("🧠 Ingested successfully. ChatID: {}", chatid);

            Chat chat = chatService.getOrCreateNewChat(chatid);
            String messageText = String.format(
                    "✅ Material `%s` processed successfully. You can now ask questions based on this file.",
                    originalFilename
            );

            ChatMessage systemMessage = new ChatMessage(messageText);
            systemMessage.setModelMessage(true);
            chat.getMessages().add(systemMessage);
            chatMessageService.save(systemMessage);
            chatService.save(chat);

            response.put("status", "success");
            response.put("chatId", chat.getId());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Error processing file: {}", e.getMessage(), e);
            response.put("error", "Error processing file: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}