package com.boardgame.model;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class Player {
    private final String id;
    private final String username;
    private final String avatarUrl;
    private final boolean isAI;

    private int coins = 2;
    private List<Card> cards = new ArrayList<>();
    private boolean eliminated = false;
    private boolean connected = true;

    private List<ActionType> actionHistory = new ArrayList<>();

    public Player(String id, String username, String avatarUrl, boolean isAI) {
        this.id = id;
        this.username = username;
        this.avatarUrl = avatarUrl;
        this.isAI = isAI;
    }

    public List<Card> getAliveCards() {
        return cards.stream().filter(Card::isAlive).toList();
    }

    public int getAliveCardCount() {
        return (int) cards.stream().filter(Card::isAlive).count();
    }

    public boolean hasCard(CardType type) {
        return cards.stream().anyMatch(c -> c.getType() == type && c.isAlive());
    }

    public List<CardType> getRevealedCards() {
        return cards.stream().filter(Card::isRevealed).map(Card::getType).toList();
    }
    public int getInfluenceCount() {
        return getAliveCardCount();
    }

    public void loseCard(CardType type) {
        cards.stream()
             .filter(c -> c.getType() == type && c.isAlive())
             .findFirst()
             .ifPresent(c -> c.setRevealed(true));
        checkEliminated();
    }

    public void loseFirstAliveCard() {
        cards.stream()
             .filter(Card::isAlive)
             .findFirst()
             .ifPresent(c -> c.setRevealed(true));
        checkEliminated();
    }

    public void checkEliminated() {
        if (getAliveCardCount() == 0) {
            this.eliminated = true;
        }
    }
}
