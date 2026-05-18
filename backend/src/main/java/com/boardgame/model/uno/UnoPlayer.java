package com.boardgame.model.uno;

import lombok.Data;
import java.util.ArrayList;
import java.util.List;

@Data
public class UnoPlayer {
    private String id;
    private String username;
    private String avatarUrl;
    private boolean isAI;
    private List<UnoCard> hand = new ArrayList<>();
    private boolean saidUno = false;

    public UnoPlayer(String id, String username, String avatarUrl, boolean isAI) {
        this.id        = id;
        this.username  = username;
        this.avatarUrl = avatarUrl;
        this.isAI      = isAI;
    }
}
