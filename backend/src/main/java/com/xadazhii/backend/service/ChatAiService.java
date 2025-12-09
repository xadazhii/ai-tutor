package com.xadazhii.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.memory.chat.ChatMemoryProvider;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.store.embedding.EmbeddingStore;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ChatAiService {

    private static final Logger logger = LoggerFactory.getLogger(ChatAiService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final ChatLanguageModel chatModel;
    private final ChatMemoryProvider chatMemoryProvider;
    private final EmbeddingStore<TextSegment> embeddingStore;
    private final EmbeddingModel embeddingModel;

    private TitleGenerator titleGenerator;
    private final Map<String, ChatSessionState> sessions = new HashMap<>();

    interface TitleGenerator {
        @SystemMessage("Generate a short title (max 5 words) for this prompt. Return ONLY the title.")
        String generateTitle(String userPrompt);
    }

    interface TutorAssistant {
        String chat(@MemoryId String chatId, @UserMessage String userMessage);
    }

    public ChatAiService(ChatLanguageModel chatModel,
                         ChatMemoryProvider chatMemoryProvider,
                         EmbeddingStore<TextSegment> embeddingStore,
                         EmbeddingModel embeddingModel) {
        this.chatModel = chatModel;
        this.chatMemoryProvider = chatMemoryProvider;
        this.embeddingStore = embeddingStore;
        this.embeddingModel = embeddingModel;
    }

    @PostConstruct
    public void init() {
        this.titleGenerator = AiServices.builder(TitleGenerator.class)
                .chatLanguageModel(this.chatModel)
                .build();
    }

    @Data
    private static class AiTestingResponse {
        private String evaluation;
        private String feedback;
        private String question;
        private List<String> options;
        private String type;
        private Integer correctOptionIndex;
    }

    private TutorAssistant buildAssistantForChat(String chatId, String mode) {
        ChatAwareContentRetriever dynamicRetriever = new ChatAwareContentRetriever(
                embeddingStore,
                embeddingModel,
                chatId,
                10,
                0.0
        );

        String systemMessage = ("testing".equals(mode))
                ? getTestingModeJsonSystemMessage()
                : getExplanationModeSystemMessage();

        return AiServices.builder(TutorAssistant.class)
                .chatLanguageModel(this.chatModel)
                .chatMemoryProvider(this.chatMemoryProvider)
                .contentRetriever(dynamicRetriever)
                .systemMessageProvider(memoryId -> systemMessage)
                .build();
    }

    public String generateResponseByMode(String chatId, String userMessage, String mode) {
        ChatSessionState session = sessions.computeIfAbsent(chatId, k -> new ChatSessionState());
        session.setCurrentMode(mode);

        TutorAssistant dynamicAssistant = buildAssistantForChat(chatId, mode);

        if ("testing".equals(mode)) {
            return handleTestingLoop(chatId, userMessage, session, dynamicAssistant);
        } else {
            return dynamicAssistant.chat(chatId, userMessage);
        }
    }
    private Integer parseUserChoiceToIndex(String input) {
        if (input == null) return null;
        String clean = input.trim().toUpperCase();
        // Патерн шукає букву (A-Z) за якою може йти ) або . або нічого.
        Matcher m = Pattern.compile("^([A-Z])[).]?$").matcher(clean);
        if (m.find()) {
            return m.group(1).charAt(0) - 'A';
        }
        return null;
    }

    private String handleTestingLoop(String chatId, String userMessage, ChatSessionState session, TutorAssistant assistant) {
        String prompt;
        String basePrompt; // Базовий промт без повідомлення про повтор

        // 1. Якщо ми чекаємо на відповідь (тобто це відповідь користувача)
        if (session.isWaitingForAnswer()) {
            String evaluationPrompt;
            Integer userChoiceIndex = parseUserChoiceToIndex(userMessage);

            if ("MC".equals(session.getLastQuestionType()) && session.getLastCorrectOptionIndex() != null) {

                if (userChoiceIndex == null) {
                    session.setWaitingForAnswer(true);
                    return "⚠️ Please select a valid option (e.g., A, B, C) or type a progress query.";
                }

                boolean isCorrect = userChoiceIndex.equals(session.getLastCorrectOptionIndex());
                String correctLabel = String.valueOf((char) ('A' + session.getLastCorrectOptionIndex()));
                String userLabel = String.valueOf((char) ('A' + userChoiceIndex));

                evaluationPrompt = String.format(
                        "PREVIOUS_QUESTION: %s. USER_ANSWER: %s. Evaluate this. IS_CORRECT: %b. CORRECT_OPTION: %s. Generate a FEEDBACK response. The feedback MUST be concise, directly address the PREVIOUS_QUESTION, and explain the concept of the correct option.",
                        session.getLastQuestionText(), userLabel, isCorrect, correctLabel
                );
            } else {
                // Відкрите питання (OPEN)
                evaluationPrompt = "USER_ANSWER: " + userMessage + ". Evaluate this answer based on the previous question context and generate a FEEDBACK response.";
            }

            prompt = evaluationPrompt;
            basePrompt = null; // Не використовується для оцінювання

        }
        // 2. Якщо ми не чекаємо на відповідь (потрібно згенерувати нове питання)
        else {
            String nextType = session.isNextQuestionOpen() ? "OPEN" : "MC";
            session.setNextQuestionOpen(!session.isNextQuestionOpen());

            String history = String.join(" | ", session.getQuestionHistory());

            // Базовий промт для генерації нового питання
            basePrompt = String.format(
                    "GENERATE_QUESTION: Analyze documents and image descriptions. Generate a new question of TYPE: %s. AVOID generating questions identical to or highly similar to these in the history: %s",
                    nextType, history
            );

            prompt = basePrompt;
            session.setLastQuestionType(nextType);
            session.setLastCorrectOptionIndex(null);
            session.setLastQuestionText(null);
        }

        // Починається цикл
        int attempts = 0;
        int maxAttempts = 5; // Збільшимо спроби, оскільки тепер є жорстка перевірка
        String lastError = "";

        while (attempts < maxAttempts) {
            try {
                String responseRaw = assistant.chat(chatId, prompt);
                String cleanJson = responseRaw.replaceAll("```json", "").replaceAll("```", "").trim();

                AiTestingResponse aiResponse = objectMapper.readValue(cleanJson, AiTestingResponse.class);

                String responseType = aiResponse.getType().toUpperCase();

                // *** ЖОРСТКА ПЕРЕВІРКА НА ПОВТОРЕННЯ ПИТАННЯ В JAVA ***
                if (("MC".equals(responseType) || "OPEN".equals(responseType))) {

                    String newQuestionText = aiResponse.getQuestion();
                    if (newQuestionText == null || newQuestionText.isEmpty()) {
                        throw new IllegalArgumentException("Question text is missing.");
                    }

                    if (session.getQuestionHistory().contains(newQuestionText)) {
                        // Якщо питання повторюється, кидаємо помилку, щоб викликати повтор циклу
                        throw new IllegalArgumentException("Question text is a duplicate. AI must generate a unique question.");
                    }

                    // Якщо не повторюється, зберігаємо та продовжуємо
                    session.setLastQuestionText(newQuestionText);
                    if (session.getQuestionHistory().size() >= 10) {
                        session.getQuestionHistory().remove(0);
                    }
                    session.getQuestionHistory().add(newQuestionText);
                    // ******************************************************

                    if ("MC".equals(responseType)) {
                        if (aiResponse.getCorrectOptionIndex() == null ||
                                aiResponse.getCorrectOptionIndex() < 0 ||
                                aiResponse.getCorrectOptionIndex() >= aiResponse.getOptions().size()) {
                            throw new IllegalArgumentException("MC question must have a valid correctOptionIndex.");
                        }
                        session.setLastCorrectOptionIndex(aiResponse.getCorrectOptionIndex());
                    } else if ("OPEN".equals(responseType)) {
                        session.setLastCorrectOptionIndex(null);
                    }
                }

                updateSessionState(session, aiResponse);
                return formatUserResponse(session, aiResponse);

            } catch (Exception e) {
                logger.warn("Attempt {} failed: {}", attempts + 1, e.getMessage());
                lastError = e.getMessage();
                attempts++;

                // Якщо помилка сталася під час генерації нового питання (тобто ми не чекали на відповідь)
                if (!session.isWaitingForAnswer() && basePrompt != null) {
                    // Ми перезаписуємо prompt, щоб проінформувати AI про проблему,
                    // і повторюємо спробу, використовуючи базовий промт.
                    prompt = basePrompt + String.format(
                            " (PREVIOUS ATTEMPT FAILED: %s. Generate a different, unique question in strict JSON format.)",
                            e.getMessage()
                    );
                } else if (attempts < maxAttempts) {
                    // Якщо це помилка парсингу відповіді користувача або загальна помилка JSON,
                    // ми просто повторюємо спробу, якщо є така можливість.
                    prompt += " (PREVIOUS ATTEMPT FAILED: Invalid JSON or Data. Ensure strict JSON format).";
                }
            }
        }

        return "⚠️ I encountered an error. Please try again. (Error: " + lastError + ")";
    }

    // Оновлена логіка: оновлюємо тільки стан очікування відповіді
    private void updateSessionState(ChatSessionState session, AiTestingResponse aiResponse) {
        String responseType = aiResponse.getType().toUpperCase();

        if ("MC".equals(responseType) || "OPEN".equals(responseType)) {
            session.setWaitingForAnswer(true);
        } else if ("FEEDBACK".equals(responseType)) {
            session.setWaitingForAnswer(false);
        }
    }

    // Оновлений формат виведення без статистики
    private String formatUserResponse(ChatSessionState session, AiTestingResponse aiResponse) {
        StringBuilder sb = new StringBuilder();
        String responseType = aiResponse.getType().toUpperCase();

        if ("FEEDBACK".equals(responseType)) {
            boolean isCorrect = "CORRECT".equalsIgnoreCase(aiResponse.getEvaluation());
            String icon = isCorrect ? "✅" : "❌";

            sb.append(icon).append(" **").append(aiResponse.getEvaluation()).append("**\n");
            sb.append(aiResponse.getFeedback()).append("\n\n");
            sb.append("---\n\n"); // Розділювач
        }

        if (session.isWaitingForAnswer() && aiResponse.getQuestion() != null) { // Якщо це питання
            sb.append("💡 **Question (").append(session.getLastQuestionType()).append("):**\n").append(aiResponse.getQuestion()).append("\n");
        }

        if ("MC".equals(session.getLastQuestionType()) &&
                session.isWaitingForAnswer() &&
                aiResponse.getOptions() != null &&
                !aiResponse.getOptions().isEmpty()) {

            sb.append("\n");
            for (int i = 0; i < aiResponse.getOptions().size(); i++) {
                char label = (char) ('A' + i);
                sb.append("**").append(label).append(")** ")
                        .append(aiResponse.getOptions().get(i))
                        .append("\n");
            }
            sb.append("\n👇 **Select the correct answer (A, B, C...).**");
        } else if ("OPEN".equals(session.getLastQuestionType()) && session.isWaitingForAnswer()) {
            sb.append("\n✍️ **Type your answer below.**");
        } else if (responseType.equals("FEEDBACK")) {
            // Після фідбеку, просимо нове питання для продовження циклу
            sb.append("🚀 Ready for the next question. What is your answer?");
        }

        return sb.toString();
    }


    private String getTestingModeJsonSystemMessage() {
        return """
            You are a strict AI Tutor API. Analyze uploaded documents AND image descriptions to conduct a test.
            
            CONTEXT INSTRUCTION:
            Use the provided context (text files AND image descriptions) to generate relevant questions and evaluate user answers.
            
            RESPONSE FORMAT:
            You MUST output ONLY valid JSON. No markdown outside JSON.
            
            JSON SCHEMA:
            {
              "evaluation": "CORRECT" | "INCORRECT" | null,
              "feedback": "Clear, concise explanation for the user's answer. MUST be relevant to the question topic. Or null if it is a new question.",
              "question": "Text of the NEW question or null if it is feedback.",
              "type": "MC" | "OPEN" | "FEEDBACK",
              "options": ["Option 1", "Option 2"] | null,
              "correctOptionIndex": 0 | null
            }
            
            LOGIC RULES:
            1. If "GENERATE_QUESTION":
               - **Purpose:** To generate a new question (either MC or OPEN).
               - **Focus:** The question and options MUST be directly based on the uploaded materials.
               - **CRITICAL FILTERING:** ABSOLUTELY DO NOT REPEAT OR GENERATE QUESTIONS THAT ARE IDENTICAL IN MEANING OR WORDING TO ANY QUESTION IN THE PROVIDED HISTORY.
               - "evaluation": null.
               - "feedback": null.
               - "question": "New question text".
               - "type": "MC" or "OPEN".
               - "options": List of 3-4 options if "MC", else null.
               - "correctOptionIndex": Index (0-based) of correct option. MUST be accurate for the given question/options if "MC", else null.
               
            2. If "USER_ANSWER":
               - **Purpose:** To evaluate the user's answer (which is an option letter A, B, C... or text).
               - **Evaluation:** Determine correctness based on the PREVIOUS question's context and the correct answer index.
               - "evaluation": "CORRECT" or "INCORRECT".
               - "feedback": **CRITICAL: The feedback MUST directly explain the correct answer to the PREVIOUS question and why the user's choice was correct or incorrect.** DO NOT mention 'main method' if the question was about 'access modifiers'.
               - "question": null.
               - "type": "FEEDBACK".
               - "options": null.
               - "correctOptionIndex": null.
            """;
    }

    private String getExplanationModeSystemMessage() {
        return """
            You are an AI Tutor. Answer based on the uploaded materials and their descriptions in this chat.
            
            **CRITICAL LANGUAGE RULE: ALL responses MUST be in English.**
            
            IMPORTANT CONTEXT RULE:
            The retrieved context includes text files AND AI-generated descriptions of images/videos uploaded by the user.
            
            1. **Analysis and Inference:** When answering, you are permitted to **logically analyze and infer** facts from the provided descriptions. For example, if the video description mentions a score change from '1-1' to '2-1', you MUST infer and state that 'a goal was scored.'
            2. **Direct Description:** If the user asks "what you see in the video," use the text descriptions to describe the visual content.
            3. **Context Check (Strict):** If after careful analysis of ALL available context (including inference), you find the topic is truly unsupported, you MUST respond with the exact phrase: "This topic is not covered in the uploaded materials." **DO NOT use any external or general knowledge on the topic.**
            """;
    }

    public String generateTitleForChat(String userMessage) {
        try {
            return titleGenerator.generateTitle(userMessage).replace("\"", "").trim();
        } catch (Exception e) {
            return "New Chat";
        }
    }

    @Getter
    @Setter
    private static class ChatSessionState {
        private String currentMode = "explanation";
        private boolean waitingForAnswer = false;
        private boolean nextQuestionOpen = false;
        private String lastQuestionType = null;
        private Integer lastCorrectOptionIndex = null;
        private String lastQuestionText = null;
        private List<String> questionHistory = new java.util.ArrayList<>();
    }
}