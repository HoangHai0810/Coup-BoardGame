package com.boardgame.service;

import com.boardgame.entity.RoomEntity;
import com.boardgame.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchmakingService {

    private final RoomRepository roomRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // GameType -> Queue of player IDs
    private final Map<String, Queue<String>> matchmakingQueues = new ConcurrentHashMap<>();
    
    // Config how many players per game type. Default to 4
    private final int PLAYERS_REQUIRED = 4;

    public void joinQueue(String playerId, String gameType) {
        String type = gameType.toUpperCase();
        matchmakingQueues.putIfAbsent(type, new ConcurrentLinkedQueue<>());
        Queue<String> queue = matchmakingQueues.get(type);
        
        if (!queue.contains(playerId)) {
            queue.add(playerId);
            log.info("Player {} joined matchmaking queue for {}. Current size: {}", playerId, type, queue.size());
            checkQueueAndMatch(type);
        }
    }

    public void leaveQueue(String playerId, String gameType) {
        String type = gameType.toUpperCase();
        Queue<String> queue = matchmakingQueues.get(type);
        if (queue != null) {
            queue.remove(playerId);
            log.info("Player {} left matchmaking queue for {}", playerId, type);
        }
    }

    private synchronized void checkQueueAndMatch(String gameType) {
        Queue<String> queue = matchmakingQueues.get(gameType);
        if (queue == null) return;

        if (queue.size() >= PLAYERS_REQUIRED) {
            List<String> matchedPlayers = new ArrayList<>();
            for (int i = 0; i < PLAYERS_REQUIRED; i++) {
                matchedPlayers.add(queue.poll());
            }

            log.info("Match found for {}: {}", gameType, matchedPlayers);
            createRoomAndNotify(gameType, matchedPlayers);
        }
    }

    private void createRoomAndNotify(String gameType, List<String> matchedPlayers) {
        RoomEntity room = new RoomEntity();
        room.setId(UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        room.setName("Trận ghép " + gameType);
        room.setGameType(gameType);
        room.setMaxPlayers(PLAYERS_REQUIRED);
        room.setHostId(matchedPlayers.get(0)); // Assign first player as host
        room.setPlayerIds(new ArrayList<>(matchedPlayers));
        room.setStatus(RoomEntity.RoomStatus.WAITING);
        room.setAiCount(0);
        
        if ("MONOPOLY".equals(gameType)) {
            room.setBoardType("VIETNAM");
        }

        RoomEntity savedRoom = roomRepository.save(room);

        // Notify each player
        for (String playerId : matchedPlayers) {
            messagingTemplate.convertAndSendToUser(
                playerId, 
                "/queue/matchmaking", 
                Map.of("status", "MATCH_FOUND", "roomId", savedRoom.getId())
            );
        }
    }
}
