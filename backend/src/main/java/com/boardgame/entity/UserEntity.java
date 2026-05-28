package com.boardgame.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserEntity implements Principal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Override
    public String getName() {
        return id != null ? id.toString() : null;
    }

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(unique = true, nullable = false, length = 100)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(length = 500)
    private String avatarUrl;


    @Column(nullable = false)
    @Builder.Default
    private int coupElo = 1000;

    @Column(nullable = false)
    @Builder.Default
    private int unoElo = 1000;

    @Column(nullable = false)
    @Builder.Default
    private int monopolyElo = 1000;

    @Column(nullable = false)
    @Builder.Default
    private int kittensElo = 1000;

    @Column(nullable = false)
    @Builder.Default
    private int totalMatches = 0;

    @Column(nullable = false)
    @Builder.Default
    private int totalWins = 0;

    private LocalDateTime lastSeen;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean online = false;
}
