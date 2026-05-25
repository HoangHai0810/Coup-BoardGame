package com.boardgame.controller;

import com.boardgame.entity.*;
import com.boardgame.repository.*;

import com.boardgame.entity.UserEntity;
import com.boardgame.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final com.boardgame.service.CoupGameService coupGameService;

    public record CreateRoomRequest(
            @NotBlank(message = "Room name must not be blank") 
            String name,

            @Min(value = 0, message = "AI count must be at least 0") 
            @Max(value = 5, message = "AI count cannot exceed 5") 
            int aiCount,

            @Min(value = 2, message = "Maximum players must be at least 2") 
            @Max(value = 6, message = "Maximum players cannot exceed 6") 
            int maxPlayers,

            String gameType,
            
            String boardType
    ) {}

    @GetMapping
    public ResponseEntity<?> listRooms() {
        List<Map<String, Object>> rooms = roomRepository
                .findByStatusOrderByCreatedAtDesc(RoomEntity.RoomStatus.WAITING)
                .stream()
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(rooms);
    }

    @PostMapping
    public ResponseEntity<?> createRoom(@AuthenticationPrincipal UserEntity me,
                                         @Valid @RequestBody CreateRoomRequest req) {
        String roomId = generateRoomCode();

        RoomEntity room = RoomEntity.builder()
                .id(roomId)
                .name(req.name())
                .hostId(me.getId().toString())
                .aiCount(req.aiCount())
                .maxPlayers(req.maxPlayers())
                .gameType(req.gameType() != null ? req.gameType().toUpperCase() : "COUP")
                .boardType(req.boardType() != null ? req.boardType().toUpperCase() : "VIETNAM")
                .playerIds(new ArrayList<>(List.of(me.getId().toString())))
                .build();
        roomRepository.save(room);
        return ResponseEntity.ok(toDto(room));
    }

    @PostMapping("/{roomId}/join")
    public ResponseEntity<?> joinRoom(@AuthenticationPrincipal UserEntity me,
                                       @PathVariable String roomId) {
        RoomEntity room = roomRepository.findById(roomId).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();
        if (room.getStatus() != RoomEntity.RoomStatus.WAITING) {
            return ResponseEntity.badRequest().body(Map.of("error", "Room is not open"));
        }
        if (room.getPlayerIds().size() >= room.getMaxPlayers() - room.getAiCount()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Room is full"));
        }

        String uid = me.getId().toString();
        if (!room.getPlayerIds().contains(uid)) {
            room.getPlayerIds().add(uid);
            roomRepository.save(room);
        }
        return ResponseEntity.ok(toDto(room));
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<?> getRoom(@PathVariable String roomId) {
        return roomRepository.findById(roomId)
                .map(r -> ResponseEntity.ok(toDto(r)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{roomId}/leave")
    public ResponseEntity<?> leaveRoom(@AuthenticationPrincipal UserEntity me,
                                        @PathVariable String roomId) {
        RoomEntity room = roomRepository.findById(roomId).orElse(null);
        if (room == null) return ResponseEntity.ok().build();

        String uid = me.getId().toString();
        room.getPlayerIds().remove(uid);

        if (room.getPlayerIds().isEmpty()) {
            roomRepository.delete(room);
            coupGameService.removeGame(roomId);
        } else {
            if (room.getHostId().equals(uid)) {
                room.setHostId(room.getPlayerIds().get(0));
            }
            roomRepository.save(room);
        }
        return ResponseEntity.ok().build();
    }

    private Map<String, Object> toDto(RoomEntity room) {
        // Resolve player names
        List<Map<String, Object>> players = room.getPlayerIds().stream()
                .map(pid -> {
                    return userRepository.findById(UUID.fromString(pid))
                            .map(u -> Map.<String, Object>of(
                                    "id", u.getId().toString(),
                                    "username", u.getUsername(),
                                    "avatarUrl", u.getAvatarUrl() != null ? u.getAvatarUrl() : ""
                            ))
                            .orElse(Map.<String, Object>of("id", pid, "username", "Unknown", "avatarUrl", ""));
                })
                .toList();

        return Map.of(
                "id", room.getId(),
                "name", room.getName(),
                "hostId", room.getHostId(),
                "gameType", room.getGameType(),
                "boardType", room.getBoardType(),
                "maxPlayers", room.getMaxPlayers(),
                "aiCount", room.getAiCount(),
                "status", room.getStatus().name(),
                "players", players,
                "createdAt", room.getCreatedAt() != null ? room.getCreatedAt().toString() : ""
        );
    }

    private String generateRoomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder();
        Random rng = new Random();
        for (int i = 0; i < 6; i++) sb.append(chars.charAt(rng.nextInt(chars.length())));
        String code = sb.toString();
        // Retry if collision
        return roomRepository.existsById(code) ? generateRoomCode() : code;
    }
}
