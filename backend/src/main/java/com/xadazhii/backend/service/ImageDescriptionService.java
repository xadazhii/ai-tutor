package com.xadazhii.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class ImageDescriptionService {

    @Value("${ollama.api.url:http://localhost:11434/api/generate}")
    private String ollamaApiUrl;

    @Value("${ollama.model.vision:llava:latest}")
    private String visionModel;

    @Value("${ffmpeg.path:/usr/local/bin/ffmpeg}")
    private String ffmpegPath;

    @Value("${file.upload-dir:/Users/m/ai_uploads}")
    private String uploadDir;

    private final RestTemplate restTemplate = new RestTemplate();

    public String describe(byte[] imageBytes) throws Exception {
        log.info("🖼️ Describing an image (size: {} bytes)", imageBytes.length);
        return describeImageBytes(imageBytes);
    }

    public String describeVideo(byte[] videoBytes, String originalFilename) throws Exception {
        log.info("📸 Analyzing silent video: {}", originalFilename);
        Path tempDir = Path.of(uploadDir);
        String tempFileId = UUID.randomUUID().toString();

        Path inputFile = tempDir.resolve(tempFileId + "_" + originalFilename);
        Path framesDir = tempDir.resolve("frames_" + tempFileId);
        Files.createDirectories(framesDir);

        try {
            Files.write(inputFile, videoBytes);

            String[] ffmpegCommand = {
                    ffmpegPath,
                    "-i", inputFile.toAbsolutePath().toString(),
                    "-vf", "fps=1/2",
                    framesDir.toAbsolutePath().toString() + "/frame_%04d.png"
            };

            log.info("Extracting frames from video {}...", originalFilename);
            if (!runProcess(ffmpegCommand, 2)) {
                throw new Exception("FFMPEG failed to extract frames from the video. The file may be corrupted or not a video.");
            }
            log.info("Frames successfully extracted to {}", framesDir);

            StringBuilder fullDescription = new StringBuilder();
            fullDescription.append("This is a visual analysis of frames from video '").append(originalFilename).append("':\n\n");

            try (var frameFiles = Files.list(framesDir)) {
                var sortedFrames = frameFiles
                        .filter(Files::isRegularFile)
                        .filter(p -> p.toString().endsWith(".png"))
                        .sorted()
                        .toList();

                if (sortedFrames.isEmpty()) {
                    log.warn("FFMPEG extracted 0 frames. The video may be too short or corrupted.");
                    fullDescription.append("(Failed to extract frames from the video.)");
                }

                for (int i = 0; i < sortedFrames.size(); i++) {
                    Path frameFile = sortedFrames.get(i);
                    log.info("Describing frame: {}", frameFile.getFileName());

                    byte[] frameBytes = Files.readAllBytes(frameFile);

                    String frameDescription = this.describeImageBytes(frameBytes);

                    int second = (i + 1) * 5;
                    fullDescription.append("[Second ~").append(second).append("]: ").append(frameDescription).append("\n");
                }
            }

            log.info("Visual analysis completed.");
            return fullDescription.toString();

        } finally {
            try {
                if (Files.exists(framesDir)) {
                    try (var frameFiles = Files.list(framesDir)) {
                        frameFiles.forEach(frame -> {
                            try { Files.delete(frame); } catch (Exception ignored) {}
                        });
                    }
                    Files.delete(framesDir);
                }
                Files.deleteIfExists(inputFile);
                log.debug("Temporary files for video analysis removed.");
            } catch (Exception e) {
                log.error("Failed to delete temporary files: {}", e.getMessage());
            }
        }
    }

    private String describeImageBytes(byte[] imageBytes) throws Exception {
        log.debug("🖼️ Generating image description via Ollama LLaVA...");

        String base64Image = Base64.getEncoder().encodeToString(imageBytes);

        Map<String, Object> body = Map.of(
                "model", visionModel,
                "prompt", "Describe this image in as much detail as possible, including all objects, text and context.",
                "images", new String[]{base64Image},
                "stream", false
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    ollamaApiUrl, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class
            );

            Object result = response.getBody() != null ? response.getBody().get("response") : null;
            String text = result != null ? result.toString().trim() : "(no response)";
            log.debug("🖼️ Received frame description: {}", text.substring(0, Math.min(text.length(), 50)) + "...");
            return text;
        } catch (Exception e) {
            log.error("❌ Error calling Ollama (LLaVA): {}", e.getMessage());
            throw new Exception("Error describing frame: " + e.getMessage(), e);
        }
    }

    private boolean runProcess(String[] command, int timeoutInMinutes) throws Exception {
        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.redirectErrorStream(true);
        Process process = processBuilder.start();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                log.debug("[PROCESS - {}]: {}", command[0], line);
            }
        }

        if (!process.waitFor(timeoutInMinutes, TimeUnit.MINUTES)) {
            process.destroyForcibly();
            throw new Exception("Process " + command[0] + " hung (timeout " + timeoutInMinutes + " min).");
        }

        return process.exitValue() == 0;
    }
}
