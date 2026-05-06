package com.boardgame.service;

import com.boardgame.entity.RoomEntity;
import com.boardgame.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoomCleanupService {

    private final RoomRepository roomRepository;
    private final CoupGameService coupGameService;
    private final ExplodingKittensService kittensService;
    private final UnoGameService unoService;

    /**
     * Run every 15 minutes to clean up "zombie" rooms.
     */
    @Scheduled(fixedRate = 900000)
    @Transactional
    public void cleanupRooms() {
        log.info("Starting room cleanup task...");
        
        LocalDateTime twelveHoursAgo = LocalDateTime.now().minusHours(12);
        
        // 1. Delete rooms with no human players
        List<RoomEntity> emptyRooms = roomRepository.findAll().stream()
                .filter(r -> r.getPlayerIds().isEmpty())
                .toList();
        
        if (!emptyRooms.isEmpty()) {
            log.info("Cleaning up {} empty rooms", emptyRooms.size());
            deleteRooms(emptyRooms);
        }

        // 2. Delete rooms waiting for more than 12 hours
        List<RoomEntity> oldRooms = roomRepository.findByStatusOrderByCreatedAtDesc(RoomEntity.RoomStatus.WAITING).stream()
                .filter(r -> r.getCreatedAt().isBefore(twelveHoursAgo))
                .toList();

        if (!oldRooms.isEmpty()) {
            log.info("Cleaning up {} old WAITING rooms", oldRooms.size());
            deleteRooms(oldRooms);
        }
    }

    private void deleteRooms(List<RoomEntity> rooms) {
        for (RoomEntity room : rooms) {
            String roomId = room.getId();
            roomRepository.delete(room);
            
            // Also clean up game states in memory
            coupGameService.removeGame(roomId);
            kittensService.removeGame(roomId);
            unoService.removeGame(roomId);
        }
    }
}
