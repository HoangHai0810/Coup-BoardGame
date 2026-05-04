package com.boardgame.model;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class GameState {

    public enum Phase {
        WAITING,
        PLAYER_TURN,
        AWAITING_RESPONSES,
        AWAITING_BLOCK_RESPONSE,
        AWAITING_CARD_LOSS,
        AWAITING_EXCHANGE,
        GAME_OVER
    }

    private Phase phase = Phase.WAITING;
    private List<Player> players = new ArrayList<>();
    private List<CardType> deck = new ArrayList<>();
    private int currentPlayerIndex = 0;
    private PendingAction pendingAction;

    private String cardLossPlayerId;
    private String cardLossReason;

    private List<String> respondedPlayerIds = new ArrayList<>();
    private List<String> actionLog = new ArrayList<>();

    private String winnerId;
    private String roomId;

    public Player getPlayerById(String id) {
        return players.stream().filter(p -> p.getId().equals(id)).findFirst().orElse(null);
    }

    public Player getCurrentPlayer() {
        if (players.isEmpty()) return null;
        return players.get(currentPlayerIndex);
    }

    public List<Player> getActivePlayers() {
        return players.stream().filter(p -> !p.isEliminated()).toList();
    }

    public void addLog(String message) {
        actionLog.add(message);
        if (actionLog.size() > 50) {
            actionLog.remove(0);
        }
    }

    public void advanceTurn() {
        respondedPlayerIds.clear();
        pendingAction = null;
        int total = players.size();
        do {
            currentPlayerIndex = (currentPlayerIndex + 1) % total;
        } while (players.get(currentPlayerIndex).isEliminated());
    }
}
