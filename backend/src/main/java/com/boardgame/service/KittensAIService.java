package com.boardgame.service;

import com.boardgame.model.kittens.*;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class KittensAIService {

    public KittensCardType decideCardToPlay(KittensGameState state, KittensPlayer ai) {

        List<KittensCardType> hand = ai.getHand();
        
        // 1. Emergency: Top card is a kitten!
        boolean knowsKittenOnTop = !state.getFutureCards().isEmpty() && 
                                   state.getFutureCards().get(0) == KittensCardType.EXPLODING_KITTEN;
        
        if (knowsKittenOnTop) {
            if (hand.contains(KittensCardType.SKIP)) return KittensCardType.SKIP;
            if (hand.contains(KittensCardType.ATTACK)) return KittensCardType.ATTACK;
            if (hand.contains(KittensCardType.SHUFFLE)) return KittensCardType.SHUFFLE;
        }

        // 2. Strategic use
        if (hand.contains(KittensCardType.SEE_THE_FUTURE) && state.getFutureCards().isEmpty()) {
            return KittensCardType.SEE_THE_FUTURE;
        }

        // 3. Random fun
        if (Math.random() < 0.2) {
            List<KittensCardType> playable = hand.stream()
                .filter(c -> c != KittensCardType.DEFUSE && c != KittensCardType.NOPE && c != KittensCardType.EXPLODING_KITTEN)
                .toList();
            if (!playable.isEmpty()) {
                return playable.get(new Random().nextInt(playable.size()));
            }
        }

        return null; // Draw
    }

    public String decideFavorTarget(KittensGameState state, KittensPlayer ai) {
        return state.getPlayers().stream()
                .filter(p -> !p.getId().equals(ai.getId()) && !p.isExploded())
                .findFirst()
                .map(KittensPlayer::getId)
                .orElse(null);
    }

    public KittensCardType decideCardToGive(KittensPlayer ai) {
        // Give the most useless card (e.g. a Cat card if only one)
        return ai.getHand().stream()
                .filter(c -> c != KittensCardType.DEFUSE)
                .findFirst()
                .orElse(null);
    }

    public int decideKittenPosition(int deckSize) {
        // Place it somewhere mean (e.g. 0 to 3)
        return new Random().nextInt(Math.min(3, deckSize + 1));
    }
}
