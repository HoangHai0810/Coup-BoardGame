package com.boardgame.controller.games;

import com.boardgame.model.monopoly.MonopolyGameState;
import com.boardgame.model.monopoly.MonopolyPlayer;
import com.boardgame.model.monopoly.Property;
import com.boardgame.service.MonopolyService;
import com.boardgame.service.MonopolyAIService;
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
public class MonopolyWebSocketController {

    private final MonopolyService monopolyService;
    private final MonopolyAIService monopolyAIService;
    private final SimpMessagingTemplate messaging;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    @MessageMapping("/game/{roomId}/monopoly/roll")
    public void rollDice(@DestinationVariable String roomId, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        MonopolyGameState state = monopolyService.rollDice(roomId, user.getId().toString());
        if (state != null) {
            broadcastMonopolyState(roomId, state);
            scheduleMonopolyAITurnIfNeeded(roomId, state);
        }
    }

    @MessageMapping("/game/{roomId}/monopoly/buy")
    public void buyProperty(@DestinationVariable String roomId, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        MonopolyGameState state = monopolyService.buyProperty(roomId, user.getId().toString());
        if (state != null) {
            broadcastMonopolyState(roomId, state);
            scheduleMonopolyAITurnIfNeeded(roomId, state);
        }
    }

    @MessageMapping("/game/{roomId}/monopoly/end")
    public void endMonopolyTurn(@DestinationVariable String roomId, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        MonopolyGameState state = monopolyService.endTurn(roomId, user.getId().toString());
        if (state != null) {
            broadcastMonopolyState(roomId, state);
            scheduleMonopolyAITurnIfNeeded(roomId, state);
        }
    }

    @MessageMapping("/game/{roomId}/monopoly/build")
    public void buildMonopolyHouse(@DestinationVariable String roomId, @Payload Map<String, Integer> payload, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        int propertyId = payload.get("propertyId");
        MonopolyGameState state = monopolyService.buildHouse(roomId, user.getId().toString(), propertyId);
        if (state != null) {
            broadcastMonopolyState(roomId, state);
        }
    }

    public void broadcastMonopolyState(String roomId, MonopolyGameState state) {
        if (state == null) return;
        messaging.convertAndSend("/topic/game/" + roomId, state);
    }

    public void scheduleMonopolyAITurnIfNeeded(String roomId, MonopolyGameState state) {
        if (state == null) return;
        MonopolyPlayer current = state.getPlayers().get(state.getCurrentTurnIndex());
        if (current.isAI() && !current.isBankrupt()) {
            scheduler.schedule(() -> processMonopolyAITurn(roomId), 1500, TimeUnit.MILLISECONDS);
        }
    }

    private void processMonopolyAITurn(String roomId) {
        MonopolyGameState state = monopolyService.getGame(roomId);
        if (state == null) return;
        MonopolyPlayer ai = state.getPlayers().get(state.getCurrentTurnIndex());
        if (!ai.isAI() || ai.isBankrupt()) return;

        MonopolyGameState nextState = null;
        String phase = state.getPhase();

        if ("ROLL".equals(phase)) {
            nextState = monopolyService.rollDice(roomId, ai.getId());
        } else if ("BUY".equals(phase)) {
            Property p = state.getBoard().get(ai.getPosition());
            if (p != null && monopolyAIService.decideToBuy(state, ai, p)) {
                nextState = monopolyService.buyProperty(roomId, ai.getId());
            } else {
                nextState = monopolyService.endTurn(roomId, ai.getId());
            }
        } else if ("END_TURN".equals(phase)) {
            buildHousesForAI(roomId, state, ai);
            nextState = monopolyService.endTurn(roomId, ai.getId());
        }

        if (nextState != null) {
            broadcastMonopolyState(roomId, nextState);
            scheduleMonopolyAITurnIfNeeded(roomId, nextState);
        }
    }

    private void buildHousesForAI(String roomId, MonopolyGameState state, MonopolyPlayer ai) {
        for (Property p : state.getBoard().values()) {
            if (ai.getId().equals(p.getOwnerId()) && p.getHousePrice() > 0 && p.getHousesBuilt() < 5) {
                String group = p.getColorGroup();
                boolean ownsAll = state.getBoard().values().stream()
                        .filter(prop -> prop.getColorGroup().equals(group))
                        .allMatch(prop -> ai.getId().equals(prop.getOwnerId()));
                if (ownsAll) {
                    int housesToBuild = monopolyAIService.decideHouseBuilding(state, ai, p);
                    for (int h = 0; h < housesToBuild; h++) {
                        monopolyService.buildHouse(roomId, ai.getId(), p.getId());
                    }
                }
            }
        }
    }
}
