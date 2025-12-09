package com.xadazhii.backend.api;

import com.xadazhii.backend.dto.ChatMessageRequest;
import com.xadazhii.backend.entity.Chat;
import com.xadazhii.backend.entity.ChatMessage;
import com.xadazhii.backend.service.ChatAiService;
import com.xadazhii.backend.service.ChatMessageService;
import com.xadazhii.backend.service.ChatService;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
public class ChatAPI {

    private final ChatService chatService;
    private final ChatMessageService chatMessageService;
    private final ChatAiService chatAiService;

    public ChatAPI(ChatService chatService,
                   ChatMessageService chatMessageService,
                   ChatAiService chatAiService) {
        this.chatService = chatService;
        this.chatMessageService = chatMessageService;
        this.chatAiService = chatAiService;
    }

    @PostMapping("/api/chat")
    public Chat createNewChat() {
        return chatService.save(new Chat());
    }

    @DeleteMapping("/api/chat/{chatid}")
    public void deleteChat(@PathVariable String chatid) {
        chatService.deleteById(chatid);
    }

    @Setter
    @Getter
    public static class PromptRequest {
        private String prompt;
    }

    @PostMapping("/api/chat/message")
    public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody ChatMessageRequest request) {
        try {
            String chatId = request.getChatId();
            String message = request.getMessage();
            String mode = request.getMode();

            if (mode == null || (!mode.equals("explanation") && !mode.equals("testing"))) {
                mode = "explanation";
            }

            Chat chat = chatService.getOrCreateNewChat(chatId);

            ChatMessage userMessage = new ChatMessage(message);
            userMessage.setModelMessage(false);
            chat.getMessages().add(userMessage);
            chatMessageService.save(userMessage);

            String response = chatAiService.generateResponseByMode(chat.getId(), message, mode);

            ChatMessage aiMessage = new ChatMessage(response);
            aiMessage.setModelMessage(true);
            chat.getMessages().add(aiMessage);
            chatMessageService.save(aiMessage);

            chatService.save(chat);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "response", response,
                    "mode", mode,
                    "chatId", chat.getId()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @GetMapping(value = "/api/fetchChat/{chatid}", produces = "application/json")
    public Chat fetchChat(@PathVariable String chatid) {
        return chatService.getOrCreateNewChat(chatid);
    }

    @Getter
    @AllArgsConstructor
    public static class ChatSummaryDTO {
        private String id;
        private String title;
    }

    @GetMapping(value = "/api/allChats", produces = "application/json")
    public List<ChatSummaryDTO> allChats() {
        List<Chat> chats = chatService.findAll();
        return chats.stream()
                .map(chat -> new ChatSummaryDTO(chat.getId(), chat.getTitle()))
                .collect(Collectors.toList());
    }

    @PostMapping(value = "/api/chat/{chatid}/title", consumes = "application/json")
    public ResponseEntity<Void> generateChatTitle(@PathVariable("chatid") String chatid,
                                                  @RequestBody PromptRequest request) {

        if (request == null || request.getPrompt() == null || request.getPrompt().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            Chat chat = chatService.getOrCreateNewChat(chatid);

            String generatedTitle = chatAiService.generateTitleForChat(request.getPrompt());

            chat.setTitle(generatedTitle);
            chatService.save(chat);

            return ResponseEntity.ok().build();

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping(value = "/api/chat/{chatid}/title", consumes = "application/json")
    public ResponseEntity<?> updateChatTitle(@PathVariable("chatid") String chatid,
                                             @RequestBody Map<String, String> body) {
        String title = body != null ? body.get("title") : null;
        if (title == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing 'title' in request body"));
        }

        Chat chat = chatService.getOrCreateNewChat(chatid);
        chat.setTitle(title.trim());
        chatService.save(chat);
        return ResponseEntity.ok(Map.of("id", chat.getId(), "title", chat.getTitle()));
    }
}