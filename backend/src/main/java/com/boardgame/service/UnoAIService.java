package com.boardgame.service;

import com.boardgame.model.uno.*;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class UnoAIService {

    public UnoCard decideCardToPlay(UnoGameState state, UnoPlayer ai) {
        // Find a card that matches color or value
        return ai.getHand().stream()
                .filter(c -> c.matches(new UnoCard("", state.getActiveColor(), state.getActiveValue())))
                .findFirst()
                .orElse(null);
    }

    public UnoColor decideNewColor(UnoPlayer ai) {
        // Pick the color ai has the most of
        Map<UnoColor, Integer> counts = new HashMap<>();
        for (UnoCard c : ai.getHand()) {
            if (c.getColor() != UnoColor.WILD) {
                counts.put(c.getColor(), counts.getOrDefault(c.getColor(), 0) + 1);
            }
        }
        return counts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(UnoColor.RED);
    }
}
