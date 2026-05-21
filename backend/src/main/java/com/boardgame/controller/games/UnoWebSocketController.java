package com.boardgame.controller.games;

import com.boardgame.model.uno.*;
import com.boardgame.service.UnoGameService;
import com.boardgame.service.UnoAIService;
import com.boardgame.entity.RoomEntity;
import com.boardgame.repository.RoomRepository;
import com.boardgame.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.util.*;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Controller
@RequiredArgsConstructor
@Slf4j
public class UnoWebSocketController {

    private final UnoGameService unoService;
    private final UnoAIService unoAIService;
    private final RoomRepository roomRepository;
    private final SimpMessagingTemplate messaging;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private final Map<String, java.util.concurrent.ScheduledFuture<?>> turnTimers = new java.util.concurrent.ConcurrentHashMap<>();

    @MessageMapping("/game/{roomId}/uno/play")
    public void handleUnoPlay(@DestinationVariable String roomId,
                               @Payload Map<String, String> payload, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        String cardId = payload.get("cardId");
        UnoColor color = payload.containsKey("color") ? UnoColor.valueOf(payload.get("color").toUpperCase()) : null;
        UnoGameState state = unoService.playCard(roomId, user.getId().toString(), cardId, color);
        broadcastUnoState(roomId, state);
    }

    @MessageMapping("/game/{roomId}/uno/draw")
    public void handleUnoDraw(@DestinationVariable String roomId, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        UnoGameState state = unoService.drawCard(roomId, user.getId().toString());
        broadcastUnoState(roomId, state);
    }

    public void scheduleUnoAITurnIfNeeded(String roomId, UnoGameState state) {
        if (state.getPhase() == UnoGameState.Phase.PLAYER_TURN && state.getCurrentPlayer().isAI()) {
            scheduler.schedule(() -> processUnoAITurn(roomId), 1200, TimeUnit.MILLISECONDS);
        }
    }

    private void processUnoAITurn(String roomId) {
        UnoGameState state = unoService.getGame(roomId);
        if (state == null || state.getPhase() != UnoGameState.Phase.PLAYER_TURN) return;
        UnoPlayer ai = state.getCurrentPlayer();
        if (!ai.isAI()) return;

        UnoCard card = unoAIService.decideCardToPlay(state, ai);
        UnoGameState nextState;
        if (card != null) {
            UnoColor color = (card.getColor() == UnoColor.WILD) ? unoAIService.decideNewColor(ai) : null;
            nextState = unoService.playCard(roomId, ai.getId(), card.getId(), color);
        } else {
            nextState = unoService.drawCard(roomId, ai.getId());
        }
        broadcastUnoState(roomId, nextState);
    }

    public void broadcastUnoState(String roomId, UnoGameState state) {
        cancelTimer(roomId);
        
        Map<String, Object> publicState = buildUnoPublicState(state);
        messaging.convertAndSend("/topic/game/" + roomId, (Object) publicState);

        for (UnoPlayer p : state.getPlayers()) {
            if (!p.isAI()) {
                Map<String, Object> privateInfo = Map.of(
                        "playerId", p.getId(),
                        "hand", p.getHand()
                );
                messaging.convertAndSend("/topic/game/" + roomId + "/private/" + p.getId(), (Object) privateInfo);
            }
        }

        scheduleUnoAITurnIfNeeded(roomId, state);

        if (state.getPhase() != UnoGameState.Phase.GAME_OVER && state.getCurrentPlayer() != null && !state.getCurrentPlayer().isAI()) {
            scheduleTimer(roomId, state.getCurrentPlayer().getId());
        }

        if (state.getPhase() == UnoGameState.Phase.GAME_OVER) {
            roomRepository.findById(roomId).ifPresent(room -> {
                room.setStatus(RoomEntity.RoomStatus.FINISHED);
                roomRepository.save(room);
            });
        }
    }

    private Map<String, Object> buildUnoPublicState(UnoGameState state) {
        List<Map<String, Object>> playerViews = state.getPlayers().stream()
                .map(p -> {
                    Map<String, Object> pv = new HashMap<>();
                    pv.put("id", p.getId());
                    pv.put("username", p.getUsername());
                    pv.put("avatarUrl", p.getAvatarUrl());
                    pv.put("handCount", p.getHand().size());
                    pv.put("isAI", p.isAI());
                    return pv;
                }).toList();

        Map<String, Object> pub = new HashMap<>();
        pub.put("gameType", "UNO");
        pub.put("phase", state.getPhase().name());
        pub.put("players", playerViews);
        pub.put("currentPlayerId", state.getCurrentPlayer().getId());
        pub.put("actionLog", state.getActionLog());
        pub.put("winnerId", state.getWinnerId());
        pub.put("activeColor", state.getActiveColor().name());
        pub.put("activeValue", state.getActiveValue().name());
        pub.put("drawPileCount", state.getDrawPile().size());
        pub.put("clockwise", state.isClockwise());
        pub.put("discardTop", state.getDiscardPile().get(0));

        return pub;
    }

    private void cancelTimer(String roomId) {
        java.util.concurrent.ScheduledFuture<?> timer = turnTimers.remove(roomId);
        if (timer != null) {
            timer.cancel(false);
        }
    }

    private void scheduleTimer(String roomId, String currentPlayerId) {
        java.util.concurrent.ScheduledFuture<?> timer = scheduler.schedule(() -> {
            try {
                handleTurnTimeout(roomId, currentPlayerId);
            } catch (Exception e) {
                log.error("Error executing turn timeout for room " + roomId, e);
            }
        }, 30, TimeUnit.SECONDS);
        turnTimers.put(roomId, timer);
    }

    private void handleTurnTimeout(String roomId, String currentPlayerId) {
        log.info("Turn timeout (30s) triggered for room {}, gameType UNO, player {}", roomId, currentPlayerId);
        UnoGameState state = unoService.getGame(roomId);
        if (state != null && state.getCurrentPlayer() != null && state.getCurrentPlayer().getId().equals(currentPlayerId)) {
            log.info("Timeout: auto-drawing Uno card for player {} in room {}", currentPlayerId, roomId);
            UnoGameState newState = unoService.drawCard(roomId, currentPlayerId);
            broadcastUnoState(roomId, newState);
        }
    }
}
