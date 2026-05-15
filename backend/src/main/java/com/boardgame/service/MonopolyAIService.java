package com.boardgame.service;

import com.boardgame.model.monopoly.MonopolyGameState;
import com.boardgame.model.monopoly.MonopolyPlayer;
import com.boardgame.model.monopoly.Property;
import org.springframework.stereotype.Service;

@Service
public class MonopolyAIService {

    public boolean decideToBuy(MonopolyGameState state, MonopolyPlayer ai, Property p) {
        // Simple AI: Buy if has enough money and property is unowned
        return ai.getMoney() >= p.getPrice();
    }

    public int decideHouseBuilding(MonopolyPlayer ai, Property p) {
        // Not implemented building logic for v1
        return 0;
    }
}
