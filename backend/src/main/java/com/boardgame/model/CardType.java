package com.boardgame.model;

import lombok.Getter;

@Getter
public enum CardType {
    DUKE("Duke", "Get 3 coins from the bank. Block Influence."),
    ASSASSIN("Assassin", "Take 3 coins to assassinate another player."),
    CAPTAIN("Captain", "Steal 2 coins from another player. Block steal."),
    AMBASSADOR("Ambassador", "Exchange cards with the deck. Block steal."),
    CONTESSA("Contessa", "Block assassinations.");

    private final String displayName;
    private final String description;

    CardType(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }
}
