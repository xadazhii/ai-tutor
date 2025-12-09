package com.xadazhii.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Entity
public class Chat {

    @Id
    private String id;

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<ChatMessage> messages;

    @Column(length = 100)
    private String title;

    @Transient
    private boolean isNew;

    public Chat() {
        this.id = UUID.randomUUID().toString();
        this.messages = new ArrayList<>();
        this.title = "New Chat";
        this.isNew = true;
    }

    public boolean isPending() {
        for (ChatMessage message : messages) {
            if (message.isPending()) {
                return true;
            }
        }
        return false;
    }
}
