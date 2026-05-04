package com.boardgame.controller;

import com.boardgame.service.*;

import com.boardgame.entity.UserEntity;
import com.boardgame.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public record RegisterRequest(
            @NotBlank @Size(min = 3, max = 50) String username,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 6) String password
    ) {}

    public record LoginRequest(
            @NotBlank String usernameOrEmail,
            @NotBlank String password
    ) {}

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        if (userRepository.existsByUsername(req.username())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already taken"));
        }
        if (userRepository.existsByEmail(req.email())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }

        UserEntity user = UserEntity.builder()
                .username(req.username())
                .email(req.email())
                .passwordHash(passwordEncoder.encode(req.password()))
                .avatarUrl(generateAvatar(req.username()))
                .build();
        userRepository.save(user);

        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(buildAuthResponse(user, token));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        UserEntity user = userRepository.findByUsername(req.usernameOrEmail())
                .or(() -> userRepository.findByEmail(req.usernameOrEmail()))
                .orElse(null);

        if (user == null || !passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        user.setOnline(true);
        userRepository.save(user);

        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(buildAuthResponse(user, token));
    }

    private Map<String, Object> buildAuthResponse(UserEntity user, String token) {
        return Map.of(
                "token", token,
                "user", Map.of(
                        "id", user.getId().toString(),
                        "username", user.getUsername(),
                        "email", user.getEmail(),
                        "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : ""
                )
        );
    }
    
    private String generateAvatar(String username) {
        return "https://api.dicebear.com/7.x/adventurer/svg?seed=" + username;
    }
}
