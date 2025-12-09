package com.xadazhii.backend.service;

import com.xadazhii.backend.entity.Chat;
import com.xadazhii.backend.repository.ChatRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ChatService {

    private final ChatRepository chatRepository;

    public ChatService(ChatRepository chatRepository) {
        this.chatRepository = chatRepository;
    }

    public Chat getOrCreateNewChat(String chatId) {
        if (chatId == null || chatId.equals("new")) {
            Chat newChat = new Chat();
            save(newChat);
            return newChat;
        }
        return chatRepository.findById(chatId).orElseGet(() -> {
            Chat newChat = new Chat();
            save(newChat);
            return newChat;
        });
    }

    public void deleteById(String chatId) {
        chatRepository.deleteById(chatId);
    }

    public Chat save(Chat chat) {
        chatRepository.save(chat);
        return chat;
    }

    public List<Chat> findAll() {
        return chatRepository.findAll();
    }
}