package com.boardgame.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class LogEntry {
        private String key;
        private Map<String, Object> params;
    }

    private Phase phase = Phase.WAITING;
    private List<Player> players = new ArrayList<>();
    private List<CardType> deck = new ArrayList<>();
    private int currentPlayerIndex = 0;
    private PendingAction pendingAction;

    private String cardLossPlayerId;
    private String cardLossReason;

    private List<String> respondedPlayerIds = new ArrayList<>();
    private List<LogEntry> actionLog = new ArrayList<>();

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

    public void addLog(String key, Map<String, Object> params) {
        actionLog.add(new LogEntry(key, params));
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
