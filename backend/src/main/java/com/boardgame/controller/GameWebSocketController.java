package com.boardgame.controller;

import com.boardgame.controller.games.*;
import com.boardgame.model.*;
import com.boardgame.model.kittens.*;
import com.boardgame.model.uno.*;
import com.boardgame.service.ExplodingKittensService;
import com.boardgame.service.UnoGameService;
import com.boardgame.service.CoupGameService;
import com.boardgame.service.MonopolyService;
import com.boardgame.entity.RoomEntity;
import com.boardgame.repository.RoomRepository;
import com.boardgame.entity.UserEntity;
import com.boardgame.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.util.*;

@Controller
@RequiredArgsConstructor
@Slf4j
public class GameWebSocketController {

    private final CoupGameService coupGameService;
    private final ExplodingKittensService kittensService;
    private final UnoGameService unoService;
    private final MonopolyService monopolyService;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;

    // Delegate game sub-controllers
    private final CoupWebSocketController coupWebSocketController;
    private final KittensWebSocketController kittensWebSocketController;
    private final UnoWebSocketController unoWebSocketController;
    private final MonopolyWebSocketController monopolyWebSocketController;

    // ────────────────────────────────────────────────
    // START GAME
    // ────────────────────────────────────────────────

    @MessageMapping("/game/{roomId}/start")
    public void startGame(@DestinationVariable String roomId, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        RoomEntity room = roomRepository.findById(roomId).orElse(null);
        if (room == null || !room.getHostId().equals(user.getId().toString()))
            return;
        if (room.getStatus() != RoomEntity.RoomStatus.WAITING)
            return;

        List<Player> players = new ArrayList<>();
        for (String pid : room.getPlayerIds()) {
            userRepository.findById(UUID.fromString(pid))
                    .ifPresent(u -> players.add(new Player(u.getId().toString(), u.getUsername(),
                            u.getAvatarUrl() != null ? u.getAvatarUrl() : "", false)));
        }

        String[] aiNames = { "Roberta", "Magnus", "Isabella", "Viktor", "Sophia" };
        for (int i = 0; i < room.getAiCount() && players.size() < room.getMaxPlayers(); i++) {
            String aiId     = "AI_" + (i + 1);
            String aiName   = aiNames[i % aiNames.length];
            String aiAvatar = "https://api.dicebear.com/7.x/bottts/svg?seed=" + aiName;
            players.add(new Player(aiId, aiName, aiAvatar, true));
        }

        if ("KITTENS".equalsIgnoreCase(room.getGameType())) {
            List<KittensPlayer> kittensPlayers = players.stream()
                    .map(p -> new KittensPlayer(p.getId(), p.getUsername(), p.getAvatarUrl(), p.isAI()))
                    .toList();
            KittensGameState kittensState = kittensService.startGame(roomId, kittensPlayers);
            room.setStatus(RoomEntity.RoomStatus.IN_GAME);
            roomRepository.save(room);
            kittensWebSocketController.broadcastKittensState(roomId, kittensState);
        } else if ("UNO".equalsIgnoreCase(room.getGameType())) {
            List<UnoPlayer> unoPlayers = players.stream()
                    .map(p -> new UnoPlayer(p.getId(), p.getUsername(), p.getAvatarUrl(), p.isAI()))
                    .toList();
            UnoGameState unoState = unoService.startGame(roomId, unoPlayers);
            room.setStatus(RoomEntity.RoomStatus.IN_GAME);
            roomRepository.save(room);
            unoWebSocketController.broadcastUnoState(roomId, unoState);
        } else if ("MONOPOLY".equalsIgnoreCase(room.getGameType())) {
            List<com.boardgame.model.monopoly.MonopolyPlayer> monopolyPlayers = players.stream()
                    .map(p -> new com.boardgame.model.monopoly.MonopolyPlayer(p.getId(), p.getUsername(), p.getAvatarUrl(), p.isAI()))
                    .toList();
            com.boardgame.model.monopoly.MonopolyGameState state = monopolyService.startGame(roomId, monopolyPlayers);
            room.setStatus(RoomEntity.RoomStatus.IN_GAME);
            roomRepository.save(room);
            monopolyWebSocketController.broadcastMonopolyState(roomId, state);
            monopolyWebSocketController.scheduleMonopolyAITurnIfNeeded(roomId, state);
        } else {
            GameState state = coupGameService.startGame(roomId, players);
            room.setStatus(RoomEntity.RoomStatus.IN_GAME);
            roomRepository.save(room);
            coupWebSocketController.broadcastState(roomId, state);
            coupWebSocketController.scheduleAITurnIfNeeded(roomId, state);
        }
    }

    @MessageMapping("/game/{roomId}/connect")
    public void connectToGame(@DestinationVariable String roomId, Authentication auth) {
        RoomEntity room = roomRepository.findById(roomId).orElse(null);
        if (room == null || room.getStatus() != RoomEntity.RoomStatus.IN_GAME)
            return;

        if ("KITTENS".equalsIgnoreCase(room.getGameType())) {
            KittensGameState state = kittensService.getGame(roomId);
            if (state != null)
                kittensWebSocketController.broadcastKittensState(roomId, state);
        } else if ("UNO".equalsIgnoreCase(room.getGameType())) {
            UnoGameState state = unoService.getGame(roomId);
            if (state != null)
                unoWebSocketController.broadcastUnoState(roomId, state);
        } else if ("MONOPOLY".equalsIgnoreCase(room.getGameType())) {
            com.boardgame.model.monopoly.MonopolyGameState state = monopolyService.getGame(roomId);
            if (state != null)
                monopolyWebSocketController.broadcastMonopolyState(roomId, state);
        } else {
            GameState state = coupGameService.getGame(roomId);
            if (state != null)
                coupWebSocketController.broadcastState(roomId, state);
        }
    }
}
