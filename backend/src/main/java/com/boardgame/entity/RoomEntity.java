package com.boardgame.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "rooms")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomEntity {

    @Id
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private String hostId;

    @Column(nullable = false)
    @Builder.Default
    private String gameType = "COUP";

    @Column(nullable = false)
    @Builder.Default
    private int maxPlayers = 6;

    @Column(nullable = false)
    @Builder.Default
    private int aiCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RoomStatus status = RoomStatus.WAITING;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "room_players", joinColumns = @JoinColumn(name = "room_id"))
    @Column(name = "player_id")
    @Builder.Default
    private List<String> playerIds = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    public enum RoomStatus {
        WAITING, IN_GAME, FINISHED
    }
}
