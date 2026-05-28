package com.boardgame.service;

import com.boardgame.model.*;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class CoupAIService {

    private final Random rng = new Random();

    /**
     * Decide what action the AI should take on its turn.
     */
    public record AIDecision(ActionType action, String targetId, CardType blockCard) {}

    public AIDecision decideAction(GameState state, Player ai) {
        List<Player> targets = state.getActivePlayers().stream()
                .filter(p -> !p.getId().equals(ai.getId()))
                .toList();

        // Rule 1: If 10+ coins, must Coup
        if (ai.getCoins() >= 10) {
            return new AIDecision(ActionType.COUP, pickBestTarget(targets, ai), null);
        }

        // Rule 2: If 7+ coins, strongly prefer Coup
        if (ai.getCoins() >= 7 && rng.nextDouble() < 0.85) {
            return new AIDecision(ActionType.COUP, pickBestTarget(targets, ai), null);
        }

        // Rule 3: Has Assassin + 3+ coins → assassinate leading player (70% chance)
        if (ai.hasCard(CardType.ASSASSIN) && ai.getCoins() >= 3) {
            Player threatTarget = pickMostDangerousTarget(targets, state);
            if (rng.nextDouble() < 0.70) {
                return new AIDecision(ActionType.ASSASSINATE, threatTarget.getId(), null);
            }
        }

        // Rule 4: Has Captain → steal from richest player (60% chance)
        if (ai.hasCard(CardType.CAPTAIN)) {
            Player richest = targets.stream()
                    .max(Comparator.comparingInt(Player::getCoins))
                    .orElse(null);
            if (richest != null && richest.getCoins() > 0 && rng.nextDouble() < 0.60) {
                return new AIDecision(ActionType.STEAL, richest.getId(), null);
            }
        }

        // Rule 5: Has Duke → take Tax (50% chance, unless coins already high)
        if (ai.hasCard(CardType.DUKE) && ai.getCoins() < 6 && rng.nextDouble() < 0.50) {
            return new AIDecision(ActionType.TAX, null, null);
        }

        // Rule 6: Bluff Duke if no Duke and low coins (25% chance)
        if (!ai.hasCard(CardType.DUKE) && ai.getCoins() < 4 && rng.nextDouble() < 0.25) {
            return new AIDecision(ActionType.TAX, null, null); // bluffing Duke
        }

        // Rule 7: Bluff Captain to steal (20% chance)
        if (!ai.hasCard(CardType.CAPTAIN) && rng.nextDouble() < 0.20) {
            Player randomTarget = targets.get(rng.nextInt(targets.size()));
            return new AIDecision(ActionType.STEAL, randomTarget.getId(), null);
        }

        // Rule 8: Has Ambassador → exchange if on 1 card (50% chance — might get a better card)
        if (ai.hasCard(CardType.AMBASSADOR) && ai.getAliveCardCount() == 1 && rng.nextDouble() < 0.50) {
            return new AIDecision(ActionType.EXCHANGE, null, null);
        }

        // Default: Foreign Aid (safe, +2)
        return new AIDecision(ActionType.FOREIGN_AID, null, null);
    }

    /**
     * AI decides whether to challenge an action.
     * Returns true if the AI wants to challenge.
     */
    public boolean shouldChallenge(GameState state, Player ai, PendingAction pending) {
        if (pending == null) return false;

        CardType claimedCard = getClaimedCard(pending.getActionType());
        if (claimedCard == null) return false; // Income/ForeignAid/Coup not challengeable

        // Count how many of that card are visible
        long revealedCount = state.getPlayers().stream()
                .flatMap(p -> p.getRevealedCards().stream())
                .filter(c -> c == claimedCard)
                .count();

        // Count how many the AI has
        long aiHasCount = ai.getCards().stream()
                .filter(c -> c.getType() == claimedCard && c.isAlive())
                .count();

        // Total copies = 3
        long possiblyHaveCount = 3 - revealedCount - aiHasCount;

        // Calculate bluff probability
        long activePlayers = state.getActivePlayers().stream()
                .filter(p -> !p.getId().equals(ai.getId()) && !p.getId().equals(pending.getActorId()))
                .count();

        // Estimate prob actor has the card
        double probActorHasCard = possiblyHaveCount > 0
                ? Math.min(1.0, (double) possiblyHaveCount / (activePlayers + 1))
                : 0.0;

        double bluffProb = 1.0 - probActorHasCard;

        // Challenge if bluff probability > 55% (and randomize slightly)
        double threshold = 0.55 + (rng.nextDouble() * 0.15);
        return bluffProb > threshold;
    }

    /**
     * AI decides whether and how to block an action targeting it.
     */
    public record BlockDecision(boolean shouldBlock, CardType blockingCard) {}

    public BlockDecision shouldBlock(GameState state, Player ai, PendingAction pending) {
        ActionType action = pending.getActionType();

        switch (action) {
            case FOREIGN_AID -> {
                // AI blocks with Duke if it has one
                if (ai.hasCard(CardType.DUKE) && rng.nextDouble() < 0.80) {
                    return new BlockDecision(true, CardType.DUKE);
                }
                // Bluff Duke (30% chance)
                if (!ai.hasCard(CardType.DUKE) && rng.nextDouble() < 0.30) {
                    return new BlockDecision(true, CardType.DUKE);
                }
            }
            case ASSASSINATE -> {
                // Only block if targeted
                if (pending.getTargetId() != null && pending.getTargetId().equals(ai.getId())) {
                    if (ai.hasCard(CardType.CONTESSA) && rng.nextDouble() < 0.90) {
                        return new BlockDecision(true, CardType.CONTESSA);
                    }
                    // Bluff Contessa (40% chance — it's survival)
                    if (!ai.hasCard(CardType.CONTESSA) && rng.nextDouble() < 0.40) {
                        return new BlockDecision(true, CardType.CONTESSA);
                    }
                }
            }
            case STEAL -> {
                // Only block if targeted
                if (pending.getTargetId() != null && pending.getTargetId().equals(ai.getId())) {
                    if (ai.hasCard(CardType.CAPTAIN) && rng.nextDouble() < 0.75) {
                        return new BlockDecision(true, CardType.CAPTAIN);
                    }
                    if (ai.hasCard(CardType.AMBASSADOR) && rng.nextDouble() < 0.75) {
                        return new BlockDecision(true, CardType.AMBASSADOR);
                    }
                }
            }
            default -> {}
        }
        return new BlockDecision(false, null);
    }

    /**
     * AI chooses which card to lose when forced.
     */
    public CardType chooseCardToLose(Player ai) {
        // Priority: lose the card that's least useful
        // Keep Assassin if have 3+ coins, keep Duke/Captain for income
        List<Card> alive = ai.getAliveCards();
        if (alive.isEmpty()) return null;
        if (alive.size() == 1) return alive.get(0).getType();

        // Prefer to lose Contessa > Ambassador > Duke/Captain/Assassin
        CardType[] priority = {
            CardType.CONTESSA, CardType.AMBASSADOR, CardType.CAPTAIN, CardType.DUKE, CardType.ASSASSIN
        };
        for (CardType p : priority) {
            if (ai.hasCard(p)) return p;
        }
        return alive.get(0).getType();
    }

    /**
     * AI chooses which cards to keep after Ambassador exchange.
     */
    public List<CardType> chooseExchangeCards(Player ai, CardType drawn1, CardType drawn2) {
        List<CardType> all = new ArrayList<>(ai.getAliveCards().stream().map(Card::getType).toList());
        all.add(drawn1);
        all.add(drawn2);

        // Sort by preference: Assassin, Duke, Captain, Ambassador, Contessa
        Map<CardType, Integer> pref = Map.of(
            CardType.ASSASSIN, 5, CardType.DUKE, 4, CardType.CAPTAIN, 3,
            CardType.AMBASSADOR, 2, CardType.CONTESSA, 1
        );
        all.sort((a, b) -> pref.getOrDefault(b, 0) - pref.getOrDefault(a, 0));

        return all.subList(0, ai.getAliveCardCount());
    }

    // Helpers
    private String pickBestTarget(List<Player> targets, Player ai) {
        // Pick the player with the most coins (biggest threat)
        return targets.stream()
                .max(Comparator.comparingInt(Player::getCoins))
                .map(Player::getId)
                .orElse(targets.get(0).getId());
    }

    private Player pickMostDangerousTarget(List<Player> targets, GameState state) {
        // Most dangerous = most coins (closest to Coup)
        return targets.stream()
                .max(Comparator.comparingInt(Player::getCoins))
                .orElse(targets.get(0));
    }

    private CardType getClaimedCard(ActionType action) {
        return switch (action) {
            case TAX -> CardType.DUKE;
            case ASSASSINATE -> CardType.ASSASSIN;
            case STEAL -> CardType.CAPTAIN;
            case EXCHANGE -> CardType.AMBASSADOR;
            default -> null;
        };
    }
}
