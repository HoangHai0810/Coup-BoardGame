package com.boardgame.service;

import com.boardgame.entity.MatchHistoryEntity;
import com.boardgame.repository.MatchHistoryRepository;
import com.boardgame.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RatingService {

    private final UserRepository userRepository;
    private final MatchHistoryRepository matchHistoryRepository;

    public void processGameOver(String gameType, List<String> allPlayerIds, String winnerId) {
        log.info("Processing Game Over for {}, Winner: {}", gameType, winnerId);

        // 1. Save Match History
        MatchHistoryEntity history = MatchHistoryEntity.builder()
                .gameType(gameType.toUpperCase())
                .playerIds(allPlayerIds)
                .winnerId(winnerId)
                .build();
        matchHistoryRepository.save(history);

        // 2. Update Stats and Elo
        for (String pid : allPlayerIds) {
            // Ignore AI players (they start with 'AI_')
            if (pid.startsWith("AI_")) continue;

            userRepository.findById(UUID.fromString(pid)).ifPresent(user -> {
                user.setTotalMatches(user.getTotalMatches() + 1);
                
                boolean isWinner = pid.equals(winnerId);
                if (isWinner) {
                    user.setTotalWins(user.getTotalWins() + 1);
                }

                // Simple Elo Delta: +25 for win, -10 for loss
                int delta = isWinner ? 25 : -10;

                switch (gameType.toUpperCase()) {
                    case "COUP" -> user.setCoupElo(Math.max(0, user.getCoupElo() + delta));
                    case "UNO" -> user.setUnoElo(Math.max(0, user.getUnoElo() + delta));
                    case "MONOPOLY" -> user.setMonopolyElo(Math.max(0, user.getMonopolyElo() + delta));
                    case "KITTENS" -> user.setKittensElo(Math.max(0, user.getKittensElo() + delta));
                }
                userRepository.save(user);
            });
        }
    }
}
