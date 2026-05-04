package com.boardgame.model;

import lombok.Data;

@Data
public class Card {
    private final CardType type;
    private boolean revealed = false;

    public Card(CardType type) {
        this.type = type;
    }

    public boolean isAlive() {
        return !revealed;
    }
}
