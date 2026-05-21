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

    public int decideHouseBuilding(MonopolyGameState state, MonopolyPlayer ai, Property p) {
        // AI will build if it has plenty of money left after building.
        // Let's keep at least 1500k in cash reserves.
        int reserveLimit = 1500;
        int currentHouses = p.getHousesBuilt();
        if (currentHouses >= 5) return 0;
        
        int maxPossible = 5 - currentHouses;
        int buildCount = 0;
        int tempMoney = ai.getMoney();
        
        while (buildCount < maxPossible && tempMoney - p.getHousePrice() >= reserveLimit) {
            tempMoney -= p.getHousePrice();
            buildCount++;
        }
        
        return buildCount;
    }
}
