package com.boardgame.model.monopoly;

import com.boardgame.model.Player;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.ArrayList;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
public class MonopolyPlayer extends Player {
    private int money;
    private int position; // 0-39
    private boolean inJail;
    private int turnsInJail;
    private int getOutOfJailCards;
    private boolean bankrupt;
    private List<Integer> propertiesOwned;

    public MonopolyPlayer() {
        super(null, null, null, false);
        this.propertiesOwned = new ArrayList<>();
    }

    public MonopolyPlayer(String id, String username, String avatarUrl, boolean isAI) {
        super(id, username, avatarUrl, isAI);
        this.money = 15000; // Starting money: 15,000k
        this.position = 0; // GO
        this.inJail = false;
        this.turnsInJail = 0;
        this.getOutOfJailCards = 0;
        this.bankrupt = false;
        this.propertiesOwned = new ArrayList<>();
    }

    public void addMoney(int amount) {
        this.money += amount;
    }

    public void deductMoney(int amount) {
        this.money -= amount;
        if (this.money < 0) {
            // Need to handle bankruptcy logic later
        }
    }
}
