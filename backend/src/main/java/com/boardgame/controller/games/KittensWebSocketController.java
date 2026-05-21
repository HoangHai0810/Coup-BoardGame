package com.boardgame.controller.games;

import com.boardgame.model.kittens.*;
import com.boardgame.service.ExplodingKittensService;
import com.boardgame.service.KittensAIService;
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
public class KittensWebSocketController {

    private final ExplodingKittensService kittensService;
    private final KittensAIService kittensAIService;
    private final RoomRepository roomRepository;
    private final SimpMessagingTemplate messaging;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private final Map<String, java.util.concurrent.ScheduledFuture<?>> turnTimers = new java.util.concurrent.ConcurrentHashMap<>();

    public record KittensActionMsg(String card, List<String> cardTypes, String targetId, String requestedCard) {}

    @MessageMapping("/game/{roomId}/kittens/play")
    public void handleKittensAction(@DestinationVariable String roomId, @Payload KittensActionMsg msg, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        try {
            List<KittensCardType> types = new ArrayList<>();
            if (msg.cardTypes() != null && !msg.cardTypes().isEmpty()) {
                for (String s : msg.cardTypes()) types.add(KittensCardType.valueOf(s.toUpperCase()));
            } else if (msg.card() != null) {
                types.add(KittensCardType.valueOf(msg.card().toUpperCase()));
            }

            KittensCardType req = null;
            if (msg.requestedCard() != null) {
                req = KittensCardType.valueOf(msg.requestedCard().toUpperCase());
            }

            KittensGameState state = kittensService.playCard(roomId, user.getId().toString(), types, msg.targetId(), req);
            broadcastKittensState(roomId, state);
        } catch (Exception e) {
            log.error("Kittens play error", e);
            sendError(roomId, user.getId().toString(), e.getMessage());
        }
    }

    @MessageMapping("/game/{roomId}/kittens/draw")
    public void handleKittensDraw(@DestinationVariable String roomId, Authentication auth) {
        UserEntity       user  = (UserEntity) auth.getPrincipal();
        KittensGameState state = kittensService.drawCard(roomId, user.getId().toString());
        broadcastKittensState(roomId, state);
    }

    @MessageMapping("/game/{roomId}/kittens/defuse")
    public void handleKittensDefuse(@DestinationVariable String roomId, @Payload Map<String, Integer> payload, Authentication auth) {
        UserEntity       user  = (UserEntity) auth.getPrincipal();
        KittensGameState state = kittensService.defuse(roomId, user.getId().toString(), payload.get("position"));
        broadcastKittensState(roomId, state);
    }

    @MessageMapping("/game/{roomId}/kittens/give-card")
    public void handleKittensGiveCard(@DestinationVariable String roomId, @Payload Map<String, String> payload, Authentication auth) {
        UserEntity       user  = (UserEntity) auth.getPrincipal();
        KittensCardType  card  = KittensCardType.valueOf(payload.get("card").toUpperCase());
        KittensGameState state = kittensService.giveCard(roomId, user.getId().toString(), card);
        broadcastKittensState(roomId, state);
    }

    public void scheduleKittensAITurnIfNeeded(String roomId, KittensGameState state) {
        KittensPlayer current = state.getCurrentPlayer();
        if (state.getPhase() == KittensGameState.Phase.PLAYER_TURN && current.isAI()) {
            scheduler.schedule(() -> processKittensAITurn(roomId), 1200, TimeUnit.MILLISECONDS);
        } else if (state.getPhase() == KittensGameState.Phase.EXPLODING && current.isAI()) {
            scheduler.schedule(() -> processKittensAIDefuse(roomId), 1500, TimeUnit.MILLISECONDS);
        } else if (state.getPhase() == KittensGameState.Phase.AWAITING_FAVOR) {
            KittensPlayer target = state.getPlayerById(state.getFavorTargetId());
            if (target != null && target.isAI()) {
                scheduler.schedule(() -> processKittensAIFavor(roomId), 1000, TimeUnit.MILLISECONDS);
            }
        }
    }

    private void processKittensAITurn(String roomId) {
        KittensGameState state = kittensService.getGame(roomId);
        if (state == null || state.getPhase() != KittensGameState.Phase.PLAYER_TURN) return;
        KittensPlayer ai = state.getCurrentPlayer();
        if (!ai.isAI()) return;

        KittensCardType toPlay = kittensAIService.decideCardToPlay(state, ai);
        KittensGameState nextState;
        if (toPlay != null) {
            String targetId = null;
            if (toPlay == KittensCardType.FAVOR) {
                targetId = kittensAIService.decideFavorTarget(state, ai);
            }
            nextState = kittensService.playCard(roomId, ai.getId(), List.of(toPlay), targetId, null);
        } else {
            nextState = kittensService.drawCard(roomId, ai.getId());
        }
        broadcastKittensState(roomId, nextState);
    }

    private void processKittensAIDefuse(String roomId) {
        KittensGameState state = kittensService.getGame(roomId);
        if (state == null || state.getPhase() != KittensGameState.Phase.EXPLODING) return;
        KittensPlayer    ai        = state.getCurrentPlayer();
        int              pos       = kittensAIService.decideKittenPosition(state.getDrawPile().size());
        KittensGameState nextState = kittensService.defuse(roomId, ai.getId(), pos);
        broadcastKittensState(roomId, nextState);
    }

    private void processKittensAIFavor(String roomId) {
        KittensGameState state = kittensService.getGame(roomId);
        if (state == null || state.getPhase() != KittensGameState.Phase.AWAITING_FAVOR) return;
        KittensPlayer    ai        = state.getPlayerById(state.getFavorTargetId());
        KittensCardType  card      = kittensAIService.decideCardToGive(ai);
        KittensGameState nextState = kittensService.giveCard(roomId, ai.getId(), card);
        broadcastKittensState(roomId, nextState);
    }

    public void broadcastKittensState(String roomId, KittensGameState state) {
        cancelTimer(roomId);
        
        Map<String, Object> publicState = buildKittensPublicState(state);
        messaging.convertAndSend("/topic/game/" + roomId, (Object) publicState);

        for (KittensPlayer p : state.getPlayers()) {
            if (!p.isAI()) {
                Map<String, Object> privateInfo = Map.of(
                        "playerId", p.getId(),
                        "hand", p.getHand().stream().map(Enum::name).toList()
                );
                messaging.convertAndSend("/topic/game/" + roomId + "/private/" + p.getId(), (Object) privateInfo);
            }
        }

        scheduleKittensAITurnIfNeeded(roomId, state);

        if (state.getPhase() != KittensGameState.Phase.GAME_OVER && state.getCurrentPlayer() != null && !state.getCurrentPlayer().isAI()) {
            scheduleTimer(roomId, state.getCurrentPlayer().getId());
        }

        if (state.getPhase() == KittensGameState.Phase.GAME_OVER) {
            roomRepository.findById(roomId).ifPresent(room -> {
                room.setStatus(RoomEntity.RoomStatus.FINISHED);
                roomRepository.save(room);
            });
        }
    }

    private Map<String, Object> buildKittensPublicState(KittensGameState state) {
        List<Map<String, Object>> playerViews = state.getPlayers().stream()
                .map(p -> {
                    Map<String, Object> pv = new HashMap<>();
                    pv.put("id", p.getId());
                    pv.put("username", p.getUsername());
                    pv.put("avatarUrl", p.getAvatarUrl());
                    pv.put("handCount", p.getHand().size());
                    pv.put("exploded", p.isExploded());
                    pv.put("isAI", p.isAI());
                    return pv;
                }).toList();

        Map<String, Object> pub = new HashMap<>();
        pub.put("gameType", "KITTENS");
        pub.put("phase", state.getPhase().name());
        pub.put("players", playerViews);
        pub.put("currentPlayerId", state.getCurrentPlayer() != null ? state.getCurrentPlayer().getId() : null);
        pub.put("actionLog", state.getActionLog());
        pub.put("winnerId", state.getWinnerId());
        pub.put("discardTop", state.getDiscardPile().isEmpty() ? null : state.getDiscardPile().get(0).name());
        pub.put("drawPileCount", state.getDrawPile().size());
        pub.put("turnsLeft", state.getTurnsLeft());
        pub.put("futureCards", state.getFutureCards());
        
        if (state.getPhase() == KittensGameState.Phase.AWAITING_FAVOR) {
            pub.put("favorTargetId", state.getFavorTargetId());
            pub.put("favorRequesterId", state.getFavorRequesterId());
        }

        return pub;
    }

    private void sendError(String roomId, String userId, String message) {
        messaging.convertAndSendToUser(userId, "/queue/error", Map.of("error", message));
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
        log.info("Turn timeout (30s) triggered for room {}, gameType KITTENS, player {}", roomId, currentPlayerId);
        KittensGameState state = kittensService.getGame(roomId);
        if (state != null && state.getCurrentPlayer() != null && state.getCurrentPlayer().getId().equals(currentPlayerId)) {
            if (state.getPhase() == KittensGameState.Phase.PLAYER_TURN) {
                log.info("Timeout: auto-drawing card for player {} in room {}", currentPlayerId, roomId);
                KittensGameState newState = kittensService.drawCard(roomId, currentPlayerId);
                broadcastKittensState(roomId, newState);
            } else if (state.getPhase() == KittensGameState.Phase.EXPLODING) {
                if (state.getCurrentPlayer().hasCard(KittensCardType.DEFUSE)) {
                    log.info("Timeout: auto-defusing card for player {} in room {}", currentPlayerId, roomId);
                    KittensGameState newState = kittensService.defuse(roomId, currentPlayerId, 0);
                    broadcastKittensState(roomId, newState);
                }
            } else if (state.getPhase() == KittensGameState.Phase.AWAITING_FAVOR) {
                KittensPlayer giver = state.getPlayerById(currentPlayerId);
                if (giver != null && !giver.getHand().isEmpty()) {
                    KittensCardType randomCard = giver.getHand().get(0);
                    log.info("Timeout: auto-giving favor card {} for player {} in room {}", randomCard, currentPlayerId, roomId);
                    KittensGameState newState = kittensService.giveCard(roomId, currentPlayerId, randomCard);
                    broadcastKittensState(roomId, newState);
                }
            }
        }
    }
}
