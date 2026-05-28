package com.boardgame.controller;

import com.boardgame.entity.UserEntity;
import com.boardgame.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final UserRepository userRepository;

    @GetMapping("/{gameType}")
    public ResponseEntity<?> getLeaderboard(@PathVariable String gameType) {
        List<UserEntity> topUsers;
        switch (gameType.toUpperCase()) {
            case "COUP" -> topUsers = userRepository.findTop50ByOrderByCoupEloDesc();
            case "UNO" -> topUsers = userRepository.findTop50ByOrderByUnoEloDesc();
            case "MONOPOLY" -> topUsers = userRepository.findTop50ByOrderByMonopolyEloDesc();
            case "KITTENS" -> topUsers = userRepository.findTop50ByOrderByKittensEloDesc();
            default -> {
                return ResponseEntity.badRequest().body("Invalid game type");
            }
        }

        // Return a DTO representation to avoid exposing passwordHash, email, etc.
        List<Map<String, Object>> response = topUsers.stream().map(u -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", u.getId());
            map.put("username", u.getUsername());
            map.put("avatarUrl", u.getAvatarUrl() != null ? u.getAvatarUrl() : "");
            map.put("elo", getEloByGameType(u, gameType.toUpperCase()));
            map.put("totalWins", u.getTotalWins());
            map.put("totalMatches", u.getTotalMatches());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    private int getEloByGameType(UserEntity user, String gameType) {
        return switch (gameType) {
            case "COUP" -> user.getCoupElo();
            case "UNO" -> user.getUnoElo();
            case "MONOPOLY" -> user.getMonopolyElo();
            case "KITTENS" -> user.getKittensElo();
            default -> 1000;
        };
    }
}
