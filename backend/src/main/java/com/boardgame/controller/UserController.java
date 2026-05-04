package com.boardgame.controller;

import com.boardgame.entity.UserEntity;
import com.boardgame.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<?> getMe(@AuthenticationPrincipal UserEntity user) {
        return ResponseEntity.ok(toDto(user));
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(@RequestParam String q) {
        if (q == null || q.trim().length() < 2) {
            return ResponseEntity.badRequest().body(Map.of("error", "Query too short"));
        }
        List<Map<String, Object>> results = userRepository.searchByUsername(q.trim())
                .stream()
                .limit(10)
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(results);
    }

    private Map<String, Object> toDto(UserEntity user) {
        return Map.of(
                "id", user.getId().toString(),
                "username", user.getUsername(),
                "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                "online", user.isOnline()
        );
    }
}
