package com.boardgame.model.kittens;

import lombok.Data;
import java.util.ArrayList;
import java.util.List;

@Data
public class KittensPlayer {
    private final String id;
    private final String username;
    private final String avatarUrl;
    private final boolean isAI;

    private List<KittensCardType> hand = new ArrayList<>();
    private boolean exploded = false;

    public KittensPlayer(String id, String username, String avatarUrl, boolean isAI) {
        this.id = id;
        this.username = username;
        this.avatarUrl = avatarUrl;
        this.isAI = isAI;
    }

    public boolean hasCard(KittensCardType type) {
        return hand.contains(type);
    }

    public void removeCard(KittensCardType type) {
        hand.remove(type);
    }
}
