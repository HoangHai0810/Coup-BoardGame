package com.boardgame.controller;

import com.boardgame.model.*;

import com.boardgame.service.CoupAIService;
import com.boardgame.service.CoupGameService;
import com.boardgame.entity.RoomEntity;
import com.boardgame.repository.RoomRepository;
import com.boardgame.entity.UserEntity;
import com.boardgame.repository.UserRepository;
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
public class GameWebSocketController {

    private final CoupGameService coupGameService;
    private final CoupAIService coupAIService;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messaging;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    // DTO records for messages
    public record ActionMsg(String action, String targetId) {}
    public record BlockMsg(String card) {}
    public record CardChoiceMsg(String card) {}
    public record ExchangeMsg(List<String> keepCards) {}

    // ────────────────────────────────────────────────
    // START GAME
    // ────────────────────────────────────────────────

    @MessageMapping("/game/{roomId}/start")
    public void startGame(@DestinationVariable String roomId, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        RoomEntity room = roomRepository.findById(roomId).orElse(null);
        if (room == null || !room.getHostId().equals(user.getId().toString())) return;
        if (room.getStatus() != RoomEntity.RoomStatus.WAITING) return;

        // Build player list
        List<Player> players = new ArrayList<>();
        for (String pid : room.getPlayerIds()) {
            userRepository.findById(UUID.fromString(pid)).ifPresent(u ->
                    players.add(new Player(u.getId().toString(), u.getUsername(),
                            u.getAvatarUrl() != null ? u.getAvatarUrl() : "", false)));
        }

        // Add AI bots
        String[] aiNames = {"Roberta", "Magnus", "Isabella", "Viktor", "Sophia"};
        for (int i = 0; i < room.getAiCount() && players.size() < room.getMaxPlayers(); i++) {
            String aiId = "AI_" + (i + 1);
            String aiName = aiNames[i % aiNames.length];
            String aiAvatar = "https://api.dicebear.com/7.x/bottts/svg?seed=" + aiName;
            players.add(new Player(aiId, aiName, aiAvatar, true));
        }

        GameState state = coupGameService.startGame(roomId, players);
        room.setStatus(RoomEntity.RoomStatus.IN_GAME);
        roomRepository.save(room);

        broadcastState(roomId, state);
        scheduleAITurnIfNeeded(roomId, state);
    }

    // ────────────────────────────────────────────────
    // PLAYER ACTIONS
    // ────────────────────────────────────────────────

    @MessageMapping("/game/{roomId}/action")
    public void handleAction(@DestinationVariable String roomId,
                              @Payload ActionMsg msg, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        try {
            ActionType actionType = ActionType.valueOf(msg.action().toUpperCase());
            GameState state = coupGameService.declareAction(roomId, user.getId().toString(), actionType, msg.targetId());
            broadcastState(roomId, state);
            scheduleAIResponseIfNeeded(roomId, state);
            scheduleAITurnIfNeeded(roomId, state);
        } catch (Exception e) {
            sendError(roomId, user.getId().toString(), e.getMessage());
        }
    }

    @MessageMapping("/game/{roomId}/allow")
    public void handleAllow(@DestinationVariable String roomId, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        GameState state = coupGameService.allowAction(roomId, user.getId().toString());
        broadcastState(roomId, state);
        scheduleAIResponseIfNeeded(roomId, state);
        scheduleAITurnIfNeeded(roomId, state);
    }

    @MessageMapping("/game/{roomId}/challenge")
    public void handleChallenge(@DestinationVariable String roomId, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        GameState state = coupGameService.challenge(roomId, user.getId().toString());
        broadcastState(roomId, state);
        scheduleAIResponseIfNeeded(roomId, state);
        scheduleAITurnIfNeeded(roomId, state);
    }

    @MessageMapping("/game/{roomId}/block")
    public void handleBlock(@DestinationVariable String roomId,
                             @Payload BlockMsg msg, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        try {
            CardType card = CardType.valueOf(msg.card().toUpperCase());
            GameState state = coupGameService.block(roomId, user.getId().toString(), card);
            broadcastState(roomId, state);
            scheduleAIResponseIfNeeded(roomId, state);
            scheduleAITurnIfNeeded(roomId, state);
        } catch (Exception e) {
            sendError(roomId, user.getId().toString(), e.getMessage());
        }
    }

    @MessageMapping("/game/{roomId}/choose-card")
    public void handleChooseCard(@DestinationVariable String roomId,
                                  @Payload CardChoiceMsg msg, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        try {
            CardType card = CardType.valueOf(msg.card().toUpperCase());
            GameState state = coupGameService.chooseCardToLose(roomId, user.getId().toString(), card);
            broadcastState(roomId, state);
            scheduleAITurnIfNeeded(roomId, state);
        } catch (Exception e) {
            sendError(roomId, user.getId().toString(), e.getMessage());
        }
    }

    @MessageMapping("/game/{roomId}/exchange")
    public void handleExchange(@DestinationVariable String roomId,
                                @Payload ExchangeMsg msg, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        try {
            List<CardType> keepCards = msg.keepCards().stream()
                    .map(s -> CardType.valueOf(s.toUpperCase()))
                    .toList();
            GameState state = coupGameService.exchangeCards(roomId, user.getId().toString(), keepCards);
            broadcastState(roomId, state);
            scheduleAITurnIfNeeded(roomId, state);
        } catch (Exception e) {
            sendError(roomId, user.getId().toString(), e.getMessage());
        }
    }

    // ────────────────────────────────────────────────
    // AI AUTOMATION
    // ────────────────────────────────────────────────

    private void scheduleAITurnIfNeeded(String roomId, GameState state) {
        if (state.getPhase() == GameState.Phase.PLAYER_TURN && state.getCurrentPlayer().isAI()) {
            scheduler.schedule(() -> processAITurn(roomId), 1200, TimeUnit.MILLISECONDS);
        }
    }

    private void scheduleAIResponseIfNeeded(String roomId, GameState state) {
        if (state.getPhase() == GameState.Phase.AWAITING_RESPONSES ||
            state.getPhase() == GameState.Phase.AWAITING_BLOCK_RESPONSE) {
            scheduler.schedule(() -> processAIResponses(roomId), 800, TimeUnit.MILLISECONDS);
        } else if (state.getPhase() == GameState.Phase.AWAITING_CARD_LOSS) {
            Player cardLossPlayer = state.getPlayerById(state.getCardLossPlayerId());
            if (cardLossPlayer != null && cardLossPlayer.isAI()) {
                scheduler.schedule(() -> processAICardLoss(roomId), 900, TimeUnit.MILLISECONDS);
            }
        } else if (state.getPhase() == GameState.Phase.AWAITING_EXCHANGE) {
            Player current = state.getPlayerById(state.getPendingAction().getActorId());
            if (current != null && current.isAI()) {
                scheduler.schedule(() -> processAIExchange(roomId), 900, TimeUnit.MILLISECONDS);
            }
        }
    }

    private void processAITurn(String roomId) {
        GameState state = coupGameService.getGame(roomId);
        if (state == null || state.getPhase() != GameState.Phase.PLAYER_TURN) return;

        Player ai = state.getCurrentPlayer();
        if (!ai.isAI()) return;

        try {
            CoupAIService.AIDecision decision = coupAIService.decideAction(state, ai);
            GameState newState = coupGameService.declareAction(roomId, ai.getId(),
                    decision.action(), decision.targetId());
            broadcastState(roomId, newState);
            scheduleAIResponseIfNeeded(roomId, newState);
        } catch (Exception e) {
            log.error("AI turn error for room {}: {}", roomId, e.getMessage());
        }
    }

    private void processAIResponses(String roomId) {
        GameState state = coupGameService.getGame(roomId);
        if (state == null) return;
        if (state.getPhase() != GameState.Phase.AWAITING_RESPONSES &&
            state.getPhase() != GameState.Phase.AWAITING_BLOCK_RESPONSE) return;

        PendingAction pending = state.getPendingAction();
        if (pending == null) return;

        // Each AI that hasn't responded yet
        for (Player ai : state.getActivePlayers()) {
            if (!ai.isAI()) continue;
            if (ai.getId().equals(pending.getActorId())) continue;
            if (state.getRespondedPlayerIds().contains(ai.getId())) continue;

            if (state.getPhase() == GameState.Phase.AWAITING_BLOCK_RESPONSE) {
                // Should the AI challenge the block?
                if (!ai.getId().equals(pending.getBlockerId()) &&
                    coupAIService.shouldChallenge(state, ai, pending)) {
                    GameState newState = coupGameService.challenge(roomId, ai.getId());
                    broadcastState(roomId, newState);
                    scheduleAIResponseIfNeeded(roomId, newState);
                    return;
                } else {
                    GameState newState = coupGameService.allowAction(roomId, ai.getId());
                    broadcastState(roomId, newState);
                    scheduleAIResponseIfNeeded(roomId, newState);
                    return;
                }
            } else {
                // Should the AI block?
                CoupAIService.BlockDecision blockDecision = coupAIService.shouldBlock(state, ai, pending);
                if (blockDecision.shouldBlock()) {
                    GameState newState = coupGameService.block(roomId, ai.getId(), blockDecision.blockingCard());
                    broadcastState(roomId, newState);
                    scheduleAIResponseIfNeeded(roomId, newState);
                    return;
                }

                // Should the AI challenge?
                if (coupAIService.shouldChallenge(state, ai, pending)) {
                    GameState newState = coupGameService.challenge(roomId, ai.getId());
                    broadcastState(roomId, newState);
                    scheduleAIResponseIfNeeded(roomId, newState);
                    return;
                }

                // Allow
                GameState newState = coupGameService.allowAction(roomId, ai.getId());
                broadcastState(roomId, newState);
                scheduleAIResponseIfNeeded(roomId, newState);
                return;
            }
        }
    }

    private void processAICardLoss(String roomId) {
        GameState state = coupGameService.getGame(roomId);
        if (state == null || state.getPhase() != GameState.Phase.AWAITING_CARD_LOSS) return;

        Player ai = state.getPlayerById(state.getCardLossPlayerId());
        if (ai == null || !ai.isAI()) return;

        CardType tolose = coupAIService.chooseCardToLose(ai);
        if (tolose == null) return;

        GameState newState = coupGameService.chooseCardToLose(roomId, ai.getId(), tolose);
        broadcastState(roomId, newState);
        scheduleAITurnIfNeeded(roomId, newState);
    }

    private void processAIExchange(String roomId) {
        GameState state = coupGameService.getGame(roomId);
        if (state == null || state.getPhase() != GameState.Phase.AWAITING_EXCHANGE) return;

        Player ai = state.getPlayerById(state.getPendingAction().getActorId());
        if (ai == null || !ai.isAI()) return;

        PendingAction pending = state.getPendingAction();
        List<CardType> keep = coupAIService.chooseExchangeCards(ai, pending.getDrawnCard1(), pending.getDrawnCard2());
        GameState newState = coupGameService.exchangeCards(roomId, ai.getId(), keep);
        broadcastState(roomId, newState);
        scheduleAITurnIfNeeded(roomId, newState);
    }

    // ────────────────────────────────────────────────
    // BROADCAST
    // ────────────────────────────────────────────────

    private void broadcastState(String roomId, GameState state) {
        // Build public view (hides alive card types from other players)
        Map<String, Object> publicState = buildPublicState(state);
        messaging.convertAndSend("/topic/game/" + roomId, (Object) publicState);

        // Send private card info to each human player
        for (Player p : state.getPlayers()) {
            if (!p.isAI()) {
                Map<String, Object> privateInfo = buildPrivateInfo(p);
                messaging.convertAndSendToUser(p.getId(), "/queue/private", privateInfo);
            }
        }

        // On game over, mark room finished
        if (state.getPhase() == GameState.Phase.GAME_OVER) {
            roomRepository.findById(roomId).ifPresent(room -> {
                room.setStatus(RoomEntity.RoomStatus.FINISHED);
                roomRepository.save(room);
            });
        }
    }

    private Map<String, Object> buildPublicState(GameState state) {
        List<Map<String, Object>> playerViews = state.getPlayers().stream()
                .map(p -> {
                    Map<String, Object> pv = new HashMap<>();
                    pv.put("id", p.getId());
                    pv.put("username", p.getUsername());
                    pv.put("avatarUrl", p.getAvatarUrl());
                    pv.put("coins", p.getCoins());
                    pv.put("influenceCount", p.getInfluenceCount());
                    pv.put("eliminated", p.isEliminated());
                    pv.put("isAI", p.isAI());
                    pv.put("revealedCards", p.getRevealedCards().stream()
                            .map(CardType::name).toList());
                    return pv;
                }).toList();

        Map<String, Object> pub = new HashMap<>();
        pub.put("phase", state.getPhase().name());
        pub.put("players", playerViews);
        pub.put("currentPlayerId", state.getCurrentPlayer() != null ? state.getCurrentPlayer().getId() : null);
        pub.put("actionLog", state.getActionLog());
        pub.put("winnerId", state.getWinnerId());

        if (state.getPendingAction() != null) {
            PendingAction pa = state.getPendingAction();
            Map<String, Object> paView = new HashMap<>();
            paView.put("actorId", pa.getActorId());
            paView.put("actionType", pa.getActionType().name());
            paView.put("targetId", pa.getTargetId());
            paView.put("blockerId", pa.getBlockerId());
            paView.put("blockingCard", pa.getBlockingCard() != null ? pa.getBlockingCard().name() : null);
            paView.put("challenged", pa.isChallenged());
            paView.put("blocked", pa.isBlocked());
            pub.put("pendingAction", paView);
        }

        pub.put("cardLossPlayerId", state.getCardLossPlayerId());

        // For exchange: include drawn cards only for the acting player
        if (state.getPhase() == GameState.Phase.AWAITING_EXCHANGE && state.getPendingAction() != null) {
            pub.put("exchangeActorId", state.getPendingAction().getActorId());
        }

        return pub;
    }

    private Map<String, Object> buildPrivateInfo(Player p) {
        return Map.of(
                "playerId", p.getId(),
                "cards", p.getCards().stream().map(c -> Map.of(
                        "type", c.getType().name(),
                        "revealed", c.isRevealed()
                )).toList()
        );
    }

    private void sendError(String roomId, String userId, String message) {
        messaging.convertAndSendToUser(userId, "/queue/error", Map.of("error", message));
    }
}
