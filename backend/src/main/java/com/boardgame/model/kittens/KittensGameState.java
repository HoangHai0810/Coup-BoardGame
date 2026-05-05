package com.boardgame.model.kittens;

import com.boardgame.model.GameState;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
public class KittensGameState {
    public enum Phase {
        WAITING,
        PLAYER_TURN,
        AWAITING_FAVOR,
        AWAITING_NOPE,
        EXPLODING,
        GAME_OVER
    }

    private String roomId;
    private Phase phase = Phase.WAITING;
    private List<KittensPlayer> players = new ArrayList<>();
    private List<KittensCardType> drawPile = new ArrayList<>();
    private List<KittensCardType> discardPile = new ArrayList<>();
    
    private int currentPlayerIndex = 0;
    private int turnsLeft = 1; // Used for Attack
    
    private List<GameState.LogEntry> actionLog = new ArrayList<>();
    private String winnerId;
    
    // For specialized actions
    private String favorTargetId;
    private String favorRequesterId;
    private List<KittensCardType> futureCards = new ArrayList<>();

    public void addLog(String key, Map<String, Object> params) {
        actionLog.add(new GameState.LogEntry(key, params));
        if (actionLog.size() > 50) {
            actionLog.remove(0);
        }
    }

    public KittensPlayer getCurrentPlayer() {
        if (players.isEmpty()) return null;
        return players.get(currentPlayerIndex);
    }

    public KittensPlayer getPlayerById(String id) {
        return players.stream().filter(p -> p.getId().equals(id)).findFirst().orElse(null);
    }

    public void advanceTurn() {
        if (turnsLeft > 1) {
            turnsLeft--;
        } else {
            turnsLeft = 1;
            do {
                currentPlayerIndex = (currentPlayerIndex + 1) % players.size();
            } while (players.get(currentPlayerIndex).isExploded());
        }
    }
}
