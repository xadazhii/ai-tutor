package com.xadazhii.backend.service;

import com.xadazhii.backend.entity.ChatMessage;
import com.xadazhii.backend.repository.ChatMessageRepository;
import org.springframework.stereotype.Service;

@Service
public class ChatMessageService {

    private final ChatMessageRepository chatMessageRepository;

    public ChatMessageService(ChatMessageRepository chatMessageRepository) {
        this.chatMessageRepository = chatMessageRepository;
    }

    public void save(ChatMessage message) {
        chatMessageRepository.save(message);
    }
}