package com.boardgame.config;

import com.boardgame.entity.UserEntity;
import com.boardgame.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final UserRepository userRepository;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Authentication auth = (Authentication) headerAccessor.getUser();
        
        if (auth != null && auth.getPrincipal() instanceof UserEntity user) {
            log.info("User connected: {}", user.getUsername());
            userRepository.findById(user.getId()).ifPresent(u -> {
                u.setOnline(true);
                u.setLastSeen(LocalDateTime.now());
                userRepository.save(u);
            });
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Authentication auth = (Authentication) headerAccessor.getUser();
        
        if (auth != null && auth.getPrincipal() instanceof UserEntity user) {
            log.info("User disconnected: {}", user.getUsername());
            userRepository.findById(user.getId()).ifPresent(u -> {
                u.setOnline(false);
                u.setLastSeen(LocalDateTime.now());
                userRepository.save(u);
            });
        }
    }
}
