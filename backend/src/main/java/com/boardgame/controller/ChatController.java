package com.boardgame.controller;

import com.boardgame.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.Map;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messaging;

    public record ChatMessage(String content, String type) {}

    @MessageMapping("/chat/global")
    public void sendGlobalMessage(@Payload ChatMessage msg, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        Map<String, Object> payload = Map.of(
                "senderId", user.getId().toString(),
                "senderName", user.getUsername(),
                "content", msg.content(),
                "timestamp", LocalDateTime.now().toString(),
                "type", "GLOBAL"
        );
        messaging.convertAndSend("/topic/chat/global", (Object) payload);
    }

    @MessageMapping("/chat/room/{roomId}")
    public void sendRoomMessage(@DestinationVariable String roomId, @Payload ChatMessage msg, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        Map<String, Object> payload = Map.of(
                "senderId", user.getId().toString(),
                "senderName", user.getUsername(),
                "content", msg.content(),
                "timestamp", LocalDateTime.now().toString(),
                "type", "ROOM"
        );
        messaging.convertAndSend("/topic/chat/room/" + roomId, (Object) payload);
    }
}
