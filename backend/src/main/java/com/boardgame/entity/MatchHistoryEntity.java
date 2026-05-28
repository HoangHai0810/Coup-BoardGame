package com.boardgame.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "match_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String gameType; // "COUP", "UNO", "MONOPOLY", "KITTENS"

    @Column
    private String winnerId; // ID of the winner, null if draw

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "match_players", joinColumns = @JoinColumn(name = "match_id"))
    @Column(name = "player_id")
    private List<String> playerIds;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
