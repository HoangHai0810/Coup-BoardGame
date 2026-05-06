package com.boardgame.repository;

import com.boardgame.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByUsername(String username);
    Optional<UserEntity> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<UserEntity> findByOnlineTrue();

    @Query("SELECT u FROM UserEntity u WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<UserEntity> searchByUsername(@Param("q") String q);
}
