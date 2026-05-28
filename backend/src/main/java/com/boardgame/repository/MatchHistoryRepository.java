package com.boardgame.repository;

import com.boardgame.entity.MatchHistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MatchHistoryRepository extends JpaRepository<MatchHistoryEntity, UUID> {
    List<MatchHistoryEntity> findTop50ByOrderByCreatedAtDesc();
    List<MatchHistoryEntity> findTop50ByGameTypeOrderByCreatedAtDesc(String gameType);
}
