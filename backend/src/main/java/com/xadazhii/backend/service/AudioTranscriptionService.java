package com.xadazhii.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class AudioTranscriptionService {

    @Value("${ffmpeg.path:/usr/local/bin/ffmpeg}")
    private String ffmpegPath;

    @Value("${whisper.cpp.path:/Users/m/whisper.cpp/build/bin/whisper-cli}")
    private String whisperPath;

    @Value("${whisper.cpp.model.path:/Users/m/whisper.cpp/models/ggml-tiny.en.bin}")
    private String whisperModelPath;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${ollama.maxFileSizeMb:100}")
    private int maxFileSizeMb;

    public String transcribe(byte[] fileBytes, String originalFilename) throws Exception {
        log.info("🎙️ Transcribe request received: name={}, size={} bytes",
                originalFilename, fileBytes.length);

        long maxBytes = (long) maxFileSizeMb * 1024L * 1024L;
        if (fileBytes.length > maxBytes) {
            throw new IllegalArgumentException("File too large. Max allowed: " + maxFileSizeMb + " MB");
        }

        Path tempDir = Files.createDirectories(Path.of(uploadDir));
        String tempFileId = UUID.randomUUID().toString();

        Path inputFile = tempDir.resolve(tempFileId + "_" + originalFilename);
        Path outputFile = tempDir.resolve(tempFileId + ".wav");

        try {

            Files.write(inputFile, fileBytes);
            log.info("Saved temporary input file: {}", inputFile);

            String[] ffmpegCommand = {
                    ffmpegPath,
                    "-i", inputFile.toAbsolutePath().toString(),
                    "-ar", "16000",
                    "-ac", "1",
                    "-c:a", "pcm_s16le",
                    outputFile.toAbsolutePath().toString()
            };

            log.info("Running FFMPEG to convert the file...");
            if (!runProcess(ffmpegCommand, 2)) {
                throw new Exception("FFMPEG failed to convert the file.");
            }
            log.info("FFMPEG successfully converted file to: {}", outputFile);

            String[] whisperCommand = {
                    whisperPath,
                    "-m", whisperModelPath,
                    "-f", outputFile.toAbsolutePath().toString(),
                    "-nt"
            };

            log.info("Running Whisper.cpp for transcription...");
            String transcription = runProcessAndGetOutput(whisperCommand, 2);

            if (transcription.isEmpty()) {
                throw new Exception("Whisper.cpp failed to transcribe the file (returned empty result).");
            }

            String cleanTranscription = transcription.trim();
            log.info("🎧 Transcription obtained (length={}): {}", cleanTranscription.length(), cleanTranscription);
            return cleanTranscription;

        } finally {
            Files.deleteIfExists(inputFile);
            Files.deleteIfExists(outputFile);
            log.info("Temporary files deleted.");
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

    private String runProcessAndGetOutput(String[] command, int timeoutInMinutes) throws Exception {
        ProcessBuilder processBuilder = new ProcessBuilder(command);
        Process process = processBuilder.start();

        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
        }
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                log.warn("[PROCESS-ERR - {}]: {}", command[0], line);
            }
        }

        if (!process.waitFor(timeoutInMinutes, TimeUnit.MINUTES)) {
            process.destroyForcibly();
            throw new Exception("Process " + command[0] + " hung (timeout " + timeoutInMinutes + " min).");
        }

        if (process.exitValue() != 0) {
            log.error("Process {} exited with error code {}. Output: {}", command[0], process.exitValue(), output);
            throw new Exception("Error while executing " + command[0]);
        }

        return output.toString();
    }
}
