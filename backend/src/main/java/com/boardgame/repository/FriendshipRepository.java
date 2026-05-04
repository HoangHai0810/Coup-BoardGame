package com.boardgame.repository;

import com.boardgame.entity.*;

import com.boardgame.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FriendshipRepository extends JpaRepository<FriendshipEntity, UUID> {

    @Query("SELECT f FROM FriendshipEntity f WHERE (f.requester = :user OR f.addressee = :user) AND f.status = 'ACCEPTED'")
    List<FriendshipEntity> findAcceptedFriendships(@Param("user") UserEntity user);

    @Query("SELECT f FROM FriendshipEntity f WHERE f.addressee = :user AND f.status = 'PENDING'")
    List<FriendshipEntity> findPendingRequests(@Param("user") UserEntity user);

    @Query("SELECT f FROM FriendshipEntity f WHERE " +
           "(f.requester.id = :uid1 AND f.addressee.id = :uid2) OR " +
           "(f.requester.id = :uid2 AND f.addressee.id = :uid1)")
    Optional<FriendshipEntity> findBetween(@Param("uid1") UUID uid1, @Param("uid2") UUID uid2);
}
