package com.boardgame.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "friendships",
    uniqueConstraints = @UniqueConstraint(columnNames = {"requester_id", "addressee_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FriendshipEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private UserEntity requester;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "addressee_id", nullable = false)
    private UserEntity addressee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FriendshipStatus status = FriendshipStatus.PENDING;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public enum FriendshipStatus {
        PENDING, ACCEPTED, BLOCKED
    }
}
