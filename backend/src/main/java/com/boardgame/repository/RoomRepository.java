package com.boardgame.repository;

import com.boardgame.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomRepository extends JpaRepository<RoomEntity, String> {
    List<RoomEntity> findByStatusOrderByCreatedAtDesc(RoomEntity.RoomStatus status);
}
