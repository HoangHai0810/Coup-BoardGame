package com.boardgame.controller;

import com.boardgame.model.*;
import com.boardgame.model.kittens.*;
import com.boardgame.model.uno.*;
import com.boardgame.service.ExplodingKittensService;
import com.boardgame.service.UnoGameService;
import com.boardgame.service.KittensAIService;
import com.boardgame.service.UnoAIService;

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
    private final ExplodingKittensService kittensService;
    private final KittensAIService kittensAIService;
    private final UnoGameService unoService;
    private final UnoAIService unoAIService;
    private final com.boardgame.service.MonopolyService monopolyService;
    private final com.boardgame.service.MonopolyAIService monopolyAIService;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messaging;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    // DTO records for messages
    public record ActionMsg(String action, String targetId) {}
    public record BlockMsg(String card) {}
    public record CardChoiceMsg(String card) {}
    public record ExchangeMsg(List<String> keepCards) {}
    public record KittensActionMsg(String card, List<String> cardTypes, String targetId, String requestedCard) {}

    // ────────────────────────────────────────────────
    // START GAME
    // ────────────────────────────────────────────────

    @MessageMapping("/game/{roomId}/start")
    public void startGame(@DestinationVariable String roomId, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        RoomEntity room = roomRepository.findById(roomId).orElse(null);
        if (room == null || !room.getHostId().equals(user.getId().toString())) return;
        if (room.getStatus() != RoomEntity.RoomStatus.WAITING) return;

        List<Player> players = new ArrayList<>();
        for (String pid : room.getPlayerIds()) {
            userRepository.findById(UUID.fromString(pid)).ifPresent(u ->
                    players.add(new Player(u.getId().toString(), u.getUsername(),
                            u.getAvatarUrl() != null ? u.getAvatarUrl() : "", false)));
        }

        String[] aiNames = {"Roberta", "Magnus", "Isabella", "Viktor", "Sophia"};
        for (int i = 0; i < room.getAiCount() && players.size() < room.getMaxPlayers(); i++) {
            String aiId = "AI_" + (i + 1);
            String aiName = aiNames[i % aiNames.length];
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
            broadcastKittensState(roomId, kittensState);
        } else if ("UNO".equalsIgnoreCase(room.getGameType())) {
            List<UnoPlayer> unoPlayers = players.stream()
                    .map(p -> new UnoPlayer(p.getId(), p.getUsername(), p.getAvatarUrl(), p.isAI()))
                    .toList();
            UnoGameState unoState = unoService.startGame(roomId, unoPlayers);
            room.setStatus(RoomEntity.RoomStatus.IN_GAME);
            roomRepository.save(room);
            broadcastUnoState(roomId, unoState);
        } else if ("MONOPOLY".equalsIgnoreCase(room.getGameType())) {
            List<com.boardgame.model.monopoly.MonopolyPlayer> monopolyPlayers = players.stream()
                    .map(p -> new com.boardgame.model.monopoly.MonopolyPlayer(p.getId(), p.getUsername(), p.getAvatarUrl(), p.isAI()))
                    .toList();
            com.boardgame.model.monopoly.MonopolyGameState state = monopolyService.startGame(roomId, monopolyPlayers);
            room.setStatus(RoomEntity.RoomStatus.IN_GAME);
            roomRepository.save(room);
            broadcastMonopolyState(roomId, state);
            scheduleMonopolyAITurnIfNeeded(roomId, state);
        } else {
            GameState state = coupGameService.startGame(roomId, players);
            room.setStatus(RoomEntity.RoomStatus.IN_GAME);
            roomRepository.save(room);
            broadcastState(roomId, state);
            scheduleAITurnIfNeeded(roomId, state);
        }
    }

    @MessageMapping("/game/{roomId}/connect")
    public void connectToGame(@DestinationVariable String roomId, Authentication auth) {
        RoomEntity room = roomRepository.findById(roomId).orElse(null);
        if (room == null || room.getStatus() != RoomEntity.RoomStatus.IN_GAME) return;

        if ("KITTENS".equalsIgnoreCase(room.getGameType())) {
            com.boardgame.model.kittens.KittensGameState state = kittensService.getGame(roomId);
            if (state != null) broadcastKittensState(roomId, state);
        } else if ("UNO".equalsIgnoreCase(room.getGameType())) {
            com.boardgame.model.uno.UnoGameState state = unoService.getGame(roomId);
            if (state != null) broadcastUnoState(roomId, state);
        } else if ("MONOPOLY".equalsIgnoreCase(room.getGameType())) {
            com.boardgame.model.monopoly.MonopolyGameState state = monopolyService.getGame(roomId);
            if (state != null) broadcastMonopolyState(roomId, state);
        } else {
            GameState state = coupGameService.getGame(roomId);
            if (state != null) broadcastState(roomId, state);
        }
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

    @MessageMapping("/game/{roomId}/kittens/play")
    public void handleKittensAction(@DestinationVariable String roomId,
                                     @Payload KittensActionMsg msg, Authentication auth) {
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
            scheduleKittensAITurnIfNeeded(roomId, state);
        } catch (Exception e) {
            log.error("Kittens play error", e);
            sendError(roomId, user.getId().toString(), e.getMessage());
        }
    }

    @MessageMapping("/game/{roomId}/kittens/draw")
    public void handleKittensDraw(@DestinationVariable String roomId, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        KittensGameState state = kittensService.drawCard(roomId, user.getId().toString());
        broadcastKittensState(roomId, state);
    }

    @MessageMapping("/game/{roomId}/kittens/defuse")
    public void handleKittensDefuse(@DestinationVariable String roomId,
                                     @Payload Map<String, Integer> payload, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        KittensGameState state = kittensService.defuse(roomId, user.getId().toString(), payload.get("position"));
        broadcastKittensState(roomId, state);
    }

    @MessageMapping("/game/{roomId}/kittens/give-card")
    public void handleKittensGiveCard(@DestinationVariable String roomId,
                                      @Payload Map<String, String> payload, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        KittensCardType card = KittensCardType.valueOf(payload.get("card").toUpperCase());
        KittensGameState state = kittensService.giveCard(roomId, user.getId().toString(), card);
        broadcastKittensState(roomId, state);
    }

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

    private void scheduleKittensAITurnIfNeeded(String roomId, KittensGameState state) {
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

    private void scheduleUnoAITurnIfNeeded(String roomId, UnoGameState state) {
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
        KittensPlayer ai = state.getCurrentPlayer();
        int pos = kittensAIService.decideKittenPosition(state.getDrawPile().size());
        KittensGameState nextState = kittensService.defuse(roomId, ai.getId(), pos);
        broadcastKittensState(roomId, nextState);
    }

    private void processKittensAIFavor(String roomId) {
        KittensGameState state = kittensService.getGame(roomId);
        if (state == null || state.getPhase() != KittensGameState.Phase.AWAITING_FAVOR) return;
        KittensPlayer ai = state.getPlayerById(state.getFavorTargetId());
        KittensCardType card = kittensAIService.decideCardToGive(ai);
        KittensGameState nextState = kittensService.giveCard(roomId, ai.getId(), card);
        broadcastKittensState(roomId, nextState);
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
            scheduleAITurnIfNeeded(roomId, newState);
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

        String excludedId = (state.getPhase() == GameState.Phase.AWAITING_BLOCK_RESPONSE)
                ? pending.getBlockerId()
                : pending.getActorId();

        // Each AI that hasn't responded yet
        for (Player ai : state.getActivePlayers()) {
            if (!ai.isAI()) continue;
            if (ai.getId().equals(excludedId)) continue;
            if (state.getRespondedPlayerIds().contains(ai.getId())) continue;

            if (state.getPhase() == GameState.Phase.AWAITING_BLOCK_RESPONSE) {
                // Should the AI challenge the block?
                if (!ai.getId().equals(pending.getBlockerId()) &&
                    coupAIService.shouldChallenge(state, ai, pending)) {
                    GameState newState = coupGameService.challenge(roomId, ai.getId());
                    broadcastState(roomId, newState);
                    scheduleAIResponseIfNeeded(roomId, newState);
                    scheduleAITurnIfNeeded(roomId, newState);
                    return;
                } else {
                    GameState newState = coupGameService.allowAction(roomId, ai.getId());
                    broadcastState(roomId, newState);
                    scheduleAIResponseIfNeeded(roomId, newState);
                    scheduleAITurnIfNeeded(roomId, newState);
                    return;
                }
            } else {
                // Should the AI block?
                CoupAIService.BlockDecision blockDecision = coupAIService.shouldBlock(state, ai, pending);
                if (blockDecision.shouldBlock()) {
                    GameState newState = coupGameService.block(roomId, ai.getId(), blockDecision.blockingCard());
                    broadcastState(roomId, newState);
                    scheduleAIResponseIfNeeded(roomId, newState);
                    scheduleAITurnIfNeeded(roomId, newState);
                    return;
                }

                // Should the AI challenge?
                if (coupAIService.shouldChallenge(state, ai, pending)) {
                    GameState newState = coupGameService.challenge(roomId, ai.getId());
                    broadcastState(roomId, newState);
                    scheduleAIResponseIfNeeded(roomId, newState);
                    scheduleAITurnIfNeeded(roomId, newState);
                    return;
                }

                // Allow
                GameState newState = coupGameService.allowAction(roomId, ai.getId());
                broadcastState(roomId, newState);
                scheduleAIResponseIfNeeded(roomId, newState);
                scheduleAITurnIfNeeded(roomId, newState);
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
        Map<String, Object> publicState = buildPublicState(state);
        messaging.convertAndSend("/topic/game/" + roomId, (Object) publicState);

        // Send private card info to each human player
        for (Player p : state.getPlayers()) {
            if (!p.isAI()) {
                Map<String, Object> privateInfo = buildPrivateInfo(p);
                messaging.convertAndSend("/topic/game/" + roomId + "/private/" + p.getId(), (Object) privateInfo);
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

    private void broadcastKittensState(String roomId, KittensGameState state) {
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

    private void broadcastUnoState(String roomId, UnoGameState state) {
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

    private void sendError(String roomId, String userId, String message) {
        messaging.convertAndSendToUser(userId, "/queue/error", Map.of("error", message));
    }

    // ────────────────────────────────────────────────
    // MONOPOLY ACTIONS
    // ────────────────────────────────────────────────

    @MessageMapping("/game/{roomId}/monopoly/roll")
    public void rollDice(@DestinationVariable String roomId, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        com.boardgame.model.monopoly.MonopolyGameState state = monopolyService.rollDice(roomId, user.getId().toString());
        if (state != null) {
            broadcastMonopolyState(roomId, state);
            scheduleMonopolyAITurnIfNeeded(roomId, state);
        }
    }

    @MessageMapping("/game/{roomId}/monopoly/buy")
    public void buyProperty(@DestinationVariable String roomId, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        com.boardgame.model.monopoly.MonopolyGameState state = monopolyService.buyProperty(roomId, user.getId().toString());
        if (state != null) {
            broadcastMonopolyState(roomId, state);
            scheduleMonopolyAITurnIfNeeded(roomId, state);
        }
    }

    @MessageMapping("/game/{roomId}/monopoly/end")
    public void endMonopolyTurn(@DestinationVariable String roomId, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        com.boardgame.model.monopoly.MonopolyGameState state = monopolyService.endTurn(roomId, user.getId().toString());
        if (state != null) {
            broadcastMonopolyState(roomId, state);
            scheduleMonopolyAITurnIfNeeded(roomId, state);
        }
    }

    private void broadcastMonopolyState(String roomId, com.boardgame.model.monopoly.MonopolyGameState state) {
        if (state == null) return;
        messaging.convertAndSend("/topic/game/" + roomId, state);
    }

    private void scheduleMonopolyAITurnIfNeeded(String roomId, com.boardgame.model.monopoly.MonopolyGameState state) {
        if (state == null) return;
        com.boardgame.model.monopoly.MonopolyPlayer current = state.getPlayers().get(state.getCurrentTurnIndex());
        if (current.isAI() && !current.isBankrupt()) {
            scheduler.schedule(() -> processMonopolyAITurn(roomId), 1500, TimeUnit.MILLISECONDS);
        }
    }

    private void processMonopolyAITurn(String roomId) {
        com.boardgame.model.monopoly.MonopolyGameState state = monopolyService.getGame(roomId);
        if (state == null) return;
        com.boardgame.model.monopoly.MonopolyPlayer ai = state.getPlayers().get(state.getCurrentTurnIndex());
        if (!ai.isAI() || ai.isBankrupt()) return;

        com.boardgame.model.monopoly.MonopolyGameState nextState = null;
        String phase = state.getPhase();

        if ("ROLL".equals(phase)) {
            nextState = monopolyService.rollDice(roomId, ai.getId());
        } else if ("BUY".equals(phase)) {
            com.boardgame.model.monopoly.Property p = state.getBoard().get(ai.getPosition());
            if (p != null && monopolyAIService.decideToBuy(state, ai, p)) {
                nextState = monopolyService.buyProperty(roomId, ai.getId());
            } else {
                // If AI doesn't buy, it just skips to end turn (MonopolyService.buyProperty also handles next phase, but we can call endTurn if phase is still BUY or ROLL)
                nextState = monopolyService.endTurn(roomId, ai.getId());
            }
        } else if ("END_TURN".equals(phase)) {
            nextState = monopolyService.endTurn(roomId, ai.getId());
        }

        if (nextState != null) {
            broadcastMonopolyState(roomId, nextState);
            scheduleMonopolyAITurnIfNeeded(roomId, nextState);
        }
    }
}
