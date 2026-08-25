package com.boardgame.model.uno;

import com.boardgame.model.GameState;
import lombok.Data;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
public class UnoGameState {
    public enum Phase {
        WAITING,
        PLAYER_TURN,
        CHOOSING_COLOR,
        GAME_OVER
    }

    private String roomId;
    private Phase phase = Phase.WAITING;
    private List<UnoPlayer> players = new ArrayList<>();
    private List<UnoCard> drawPile = new ArrayList<>();
    private List<UnoCard> discardPile = new ArrayList<>();
    
    private int currentPlayerIndex = 0;
    private boolean clockwise = true;
    
    private UnoColor activeColor; // For Wild cards
    private UnoValue activeValue;

    private List<GameState.LogEntry> actionLog = new ArrayList<>();
    private String winnerId;
    private String pendingUnoPlayerId;

    public void addLog(String key, Map<String, Object> params) {
        actionLog.add(new GameState.LogEntry(key, params));
        if (actionLog.size() > 50) actionLog.remove(0);
    }

    public UnoPlayer getCurrentPlayer() {
        return players.get(currentPlayerIndex);
    }

    public UnoPlayer getPlayerById(String id) {
        return players.stream().filter(p -> p.getId().equals(id)).findFirst().orElse(null);
    }

    public void advanceTurn() {
        int step = clockwise ? 1 : -1;
        currentPlayerIndex = (currentPlayerIndex + step + players.size()) % players.size();
    }
}
