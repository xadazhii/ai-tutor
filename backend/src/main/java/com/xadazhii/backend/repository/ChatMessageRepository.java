package com.xadazhii.backend.repository;

import com.xadazhii.backend.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("Select c from ChatMessage c")
    List<ChatMessage> getAllChatMessages();

    @Query("Select c from ChatMessage c where c.id = :Id")
    List<ChatMessage> getChatMessageById(@Param("Id") Long Id);

}
