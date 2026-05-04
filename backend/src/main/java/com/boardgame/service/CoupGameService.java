package com.boardgame.service;

import com.boardgame.model.*;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class CoupGameService {

    private final Map<String, GameState> games = new ConcurrentHashMap<>();

    public GameState getGame(String roomId) {
        return games.get(roomId);
    }

    public GameState startGame(String roomId, List<Player> players) {
        if (players.size() < 2 || players.size() > 6) {
            throw new IllegalArgumentException("Coup requires 2-6 players");
        }

        GameState state = new GameState();
        state.setRoomId(roomId);
        state.setPlayers(new ArrayList<>(players));
        state.setDeck(buildAndShuffleDeck());
        state.setPhase(GameState.Phase.PLAYER_TURN);

        for (Player p : state.getPlayers()) {
            p.setCards(new ArrayList<>());
            p.getCards().add(new Card(state.getDeck().remove(0)));
            p.getCards().add(new Card(state.getDeck().remove(0)));
            p.setCoins(2);
        }

        state.setCurrentPlayerIndex(new Random().nextInt(players.size()));

        Player first = state.getCurrentPlayer();
        state.addLog("Game started! " + first.getUsername() + "'s turn.");
        games.put(roomId, state);
        return state;
    }

    private List<CardType> buildAndShuffleDeck() {
        List<CardType> deck = new ArrayList<>();
        for (CardType type : CardType.values()) {
            deck.add(type);
            deck.add(type);
            deck.add(type);
        }
        Collections.shuffle(deck);
        return deck;
    }

    public GameState declareAction(String roomId, String playerId, ActionType action, String targetId) {
        GameState state = games.get(roomId);
        validateTurn(state, playerId);

        Player actor = state.getPlayerById(playerId);

        validateAction(state, actor, action, targetId);

        PendingAction pending = new PendingAction(playerId, action, targetId);
        state.setPendingAction(pending);

        String targetName = targetId != null ? state.getPlayerById(targetId).getUsername() : null;

        switch (action) {
            case INCOME -> {
                actor.setCoins(actor.getCoins() + 1);
                state.addLog(actor.getUsername() + " took Income (+1 coin).");
                endTurn(state);
            }
            case COUP -> {
                actor.setCoins(actor.getCoins() - 7);
                state.addLog(actor.getUsername() + " launched a Coup against " + targetName + "!");
                state.setPhase(GameState.Phase.AWAITING_CARD_LOSS);
                state.setCardLossPlayerId(targetId);
                state.setCardLossReason("COUP");
            }
            case FOREIGN_AID -> {
                state.addLog(actor.getUsername() + " is taking Foreign Aid (+2). Can be blocked by Duke.");
                state.setPhase(GameState.Phase.AWAITING_RESPONSES);
                state.setRespondedPlayerIds(new ArrayList<>());
            }
            case TAX -> {
                state.addLog(actor.getUsername() + " claims Duke and takes Tax (+3).");
                state.setPhase(GameState.Phase.AWAITING_RESPONSES);
                state.setRespondedPlayerIds(new ArrayList<>());
            }
            case ASSASSINATE -> {
                actor.setCoins(actor.getCoins() - 3);
                state.addLog(actor.getUsername() + " claims Assassin and targets " + targetName + ".");
                state.setPhase(GameState.Phase.AWAITING_RESPONSES);
                state.setRespondedPlayerIds(new ArrayList<>());
            }
            case STEAL -> {
                state.addLog(actor.getUsername() + " claims Captain and steals from " + targetName + ".");
                state.setPhase(GameState.Phase.AWAITING_RESPONSES);
                state.setRespondedPlayerIds(new ArrayList<>());
            }
            case EXCHANGE -> {
                state.addLog(actor.getUsername() + " claims Ambassador and wants to exchange cards.");
                state.setPhase(GameState.Phase.AWAITING_RESPONSES);
                state.setRespondedPlayerIds(new ArrayList<>());
            }
            default -> throw new IllegalArgumentException("Unknown action: " + action);
        }

        games.put(roomId, state);
        return state;
    }

    public GameState allowAction(String roomId, String playerId) {
        GameState state = games.get(roomId);
        if (state.getPhase() != GameState.Phase.AWAITING_RESPONSES &&
            state.getPhase() != GameState.Phase.AWAITING_BLOCK_RESPONSE) {
            return state;
        }

        if (!state.getRespondedPlayerIds().contains(playerId)) {
            state.getRespondedPlayerIds().add(playerId);
        }

        PendingAction pending = state.getPendingAction();
        List<Player> others = state.getActivePlayers().stream()
                .filter(p -> !p.getId().equals(pending.getActorId()))
                .toList();

        boolean allResponded = others.stream()
                .allMatch(p -> state.getRespondedPlayerIds().contains(p.getId()));

        if (allResponded) {
            if (state.getPhase() == GameState.Phase.AWAITING_BLOCK_RESPONSE) {
                state.addLog("Block by " + state.getPlayerById(pending.getBlockerId()).getUsername() + " was accepted. Action cancelled.");
                if (pending.getActionType() == ActionType.ASSASSINATE) {
                }
                endTurn(state);
            } else {
                resolveAction(state, pending);
            }
        }

        games.put(roomId, state);
        return state;
    }

    public GameState challenge(String roomId, String challengerId) {
        GameState state = games.get(roomId);
        PendingAction pending = state.getPendingAction();

        if (state.getPhase() == GameState.Phase.AWAITING_BLOCK_RESPONSE) {
            resolveBlockChallenge(state, pending, challengerId);
        } else if (state.getPhase() == GameState.Phase.AWAITING_RESPONSES) {
            resolveActionChallenge(state, pending, challengerId);
        }

        games.put(roomId, state);
        return state;
    }

    public GameState block(String roomId, String blockerId, CardType blockingCard) {
        GameState state = games.get(roomId);
        if (state.getPhase() != GameState.Phase.AWAITING_RESPONSES) return state;

        PendingAction pending = state.getPendingAction();

        if (!isValidBlock(pending.getActionType(), blockingCard)) {
            throw new IllegalArgumentException("Cannot block " + pending.getActionType() + " with " + blockingCard);
        }

        pending.setBlockerId(blockerId);
        pending.setBlockingCard(blockingCard);
        pending.setBlocked(true);

        Player blocker = state.getPlayerById(blockerId);
        state.addLog(blocker.getUsername() + " claims " + blockingCard.getDisplayName() + " and blocks! Others can challenge.");

        state.setRespondedPlayerIds(new ArrayList<>());
        state.setPhase(GameState.Phase.AWAITING_BLOCK_RESPONSE);

        games.put(roomId, state);
        return state;
    }

    public GameState chooseCardToLose(String roomId, String playerId, CardType cardType) {
        GameState state = games.get(roomId);
        if (state.getPhase() != GameState.Phase.AWAITING_CARD_LOSS) return state;
        if (!playerId.equals(state.getCardLossPlayerId())) return state;

        Player player = state.getPlayerById(playerId);
        player.loseCard(cardType);
        state.addLog(player.getUsername() + " reveals and loses " + cardType.getDisplayName() + ".");

        if (player.isEliminated()) {
            state.addLog(player.getUsername() + " is eliminated!");
        }

        checkWinner(state);
        if (state.getPhase() != GameState.Phase.GAME_OVER) {
            String reason = state.getCardLossReason();
            if ("ASSASSINATED".equals(reason)) {
                endTurn(state);
            } else if ("LOST_CHALLENGE_BLOCKER".equals(reason)) {
                resolveAction(state, state.getPendingAction());
            } else {
                endTurn(state);
            }
        }

        games.put(roomId, state);
        return state;
    }

    public GameState exchangeCards(String roomId, String playerId, List<CardType> keepCards) {
        GameState state = games.get(roomId);
        if (state.getPhase() != GameState.Phase.AWAITING_EXCHANGE) return state;

        Player player = state.getPlayerById(playerId);
        PendingAction pending = state.getPendingAction();

        List<CardType> drawn = List.of(pending.getDrawnCard1(), pending.getDrawnCard2());
        List<CardType> allOptions = new ArrayList<>(player.getAliveCards().stream().map(Card::getType).toList());
        allOptions.addAll(drawn);

        if (keepCards.size() != player.getAliveCardCount()) {
            throw new IllegalArgumentException("Must keep exactly " + player.getAliveCardCount() + " cards");
        }

        List<CardType> mutableOptions = new ArrayList<>(allOptions);
        for (CardType kept : keepCards) {
            if (!mutableOptions.remove(kept)) {
                throw new IllegalArgumentException("Invalid card choice: " + kept);
            }
        }

        player.getCards().removeIf(Card::isAlive);
        for (CardType k : keepCards) {
            player.getCards().add(new Card(k));
        }
        state.getDeck().addAll(mutableOptions);
        Collections.shuffle(state.getDeck());

        state.addLog(playerId + " exchanged cards with the deck.");
        endTurn(state);

        games.put(roomId, state);
        return state;
    }

    private void resolveAction(GameState state, PendingAction pending) {
        Player actor = state.getPlayerById(pending.getActorId());
        Player target = pending.getTargetId() != null ? state.getPlayerById(pending.getTargetId()) : null;

        switch (pending.getActionType()) {
            case FOREIGN_AID -> {
                actor.setCoins(actor.getCoins() + 2);
                state.addLog(actor.getUsername() + " received Foreign Aid (+2 coins).");
                endTurn(state);
            }
            case TAX -> {
                actor.setCoins(actor.getCoins() + 3);
                state.addLog(actor.getUsername() + " collected Tax (+3 coins).");
                endTurn(state);
            }
            case ASSASSINATE -> {
                state.addLog(actor.getUsername() + " assassinates " + target.getUsername() + "!");
                state.setPhase(GameState.Phase.AWAITING_CARD_LOSS);
                state.setCardLossPlayerId(target.getId());
                state.setCardLossReason("ASSASSINATED");
            }
            case STEAL -> {
                int stolen = Math.min(2, target.getCoins());
                target.setCoins(target.getCoins() - stolen);
                actor.setCoins(actor.getCoins() + stolen);
                state.addLog(actor.getUsername() + " steals " + stolen + " coins from " + target.getUsername() + ".");
                endTurn(state);
            }
            case EXCHANGE -> {
                if (state.getDeck().size() < 2) {
                    state.addLog("Deck empty — exchange skipped.");
                    endTurn(state);
                    return;
                }
                CardType drawn1 = state.getDeck().remove(0);
                CardType drawn2 = state.getDeck().remove(0);
                pending.setDrawnCard1(drawn1);
                pending.setDrawnCard2(drawn2);
                state.addLog(actor.getUsername() + " draws 2 cards to choose from.");
                state.setPhase(GameState.Phase.AWAITING_EXCHANGE);
            }
            default -> endTurn(state);
        }
    }

    private void resolveActionChallenge(GameState state, PendingAction pending, String challengerId) {
        Player actor = state.getPlayerById(pending.getActorId());
        Player challenger = state.getPlayerById(challengerId);

        CardType claimedCard = getClaimedCard(pending.getActionType());
        boolean actorHasCard = claimedCard != null && actor.hasCard(claimedCard);

        if (actorHasCard) {
            state.addLog(challenger.getUsername() + " challenged " + actor.getUsername() + "'s " +
                         claimedCard.getDisplayName() + " — and was WRONG! " + challenger.getUsername() + " loses a card.");
            replaceCard(state, actor, claimedCard);

            state.setPhase(GameState.Phase.AWAITING_CARD_LOSS);
            state.setCardLossPlayerId(challengerId);
            state.setCardLossReason("LOST_CHALLENGE");
            pending.setChallenged(true);
            pending.setChallengerId(challengerId);
        } else {
            if (pending.getActionType() == ActionType.ASSASSINATE) {
                actor.setCoins(actor.getCoins() + 3);
            }
            state.setPhase(GameState.Phase.AWAITING_CARD_LOSS);
            state.setCardLossPlayerId(actor.getId());
            state.setCardLossReason("LOST_CHALLENGE");
        }
    }

    private void resolveBlockChallenge(GameState state, PendingAction pending, String challengerId) {
        Player blocker = state.getPlayerById(pending.getBlockerId());
        Player challenger = state.getPlayerById(challengerId);
        CardType blockingCard = pending.getBlockingCard();

        boolean blockerHasCard = blocker.hasCard(blockingCard);

        if (blockerHasCard) {
            state.addLog(challenger.getUsername() + " challenged the block — and was WRONG! " +
                         challenger.getUsername() + " loses a card.");
            replaceCard(state, blocker, blockingCard);

            state.setPhase(GameState.Phase.AWAITING_CARD_LOSS);
            state.setCardLossPlayerId(challengerId);
            state.setCardLossReason("LOST_CHALLENGE");
        } else {
            state.addLog(challenger.getUsername() + " challenged the block — and was RIGHT! " +
                         blocker.getUsername() + " loses a card. Action resolves!");
            state.setPhase(GameState.Phase.AWAITING_CARD_LOSS);
            state.setCardLossPlayerId(blocker.getId());
            state.setCardLossReason("LOST_CHALLENGE_BLOCKER");
        }
    }

    private void replaceCard(GameState state, Player actor, CardType cardType) {
        actor.getCards().stream()
             .filter(c -> c.getType() == cardType && c.isAlive())
             .findFirst()
             .ifPresent(c -> {
                 actor.getCards().remove(c);
                 state.getDeck().add(cardType);
                 Collections.shuffle(state.getDeck());
                 if (!state.getDeck().isEmpty()) {
                     actor.getCards().add(new Card(state.getDeck().remove(0)));
                 }
             });
    }

    private void endTurn(GameState state) {
        checkWinner(state);
        if (state.getPhase() != GameState.Phase.GAME_OVER) {
            state.advanceTurn();
            state.setPhase(GameState.Phase.PLAYER_TURN);
            state.addLog("--- " + state.getCurrentPlayer().getUsername() + "'s turn ---");
        }
    }

    private void checkWinner(GameState state) {
        List<Player> alive = state.getActivePlayers();
        if (alive.size() == 1) {
            state.setPhase(GameState.Phase.GAME_OVER);
            state.setWinnerId(alive.get(0).getId());
            state.addLog("🏆 " + alive.get(0).getUsername() + " wins the game!");
        }
    }

    private void validateTurn(GameState state, String playerId) {
        if (state == null) throw new IllegalStateException("Game not found");
        if (state.getPhase() != GameState.Phase.PLAYER_TURN) {
            throw new IllegalStateException("Not in player turn phase");
        }
        if (!state.getCurrentPlayer().getId().equals(playerId)) {
            throw new IllegalStateException("Not your turn");
        }
    }

    private void validateAction(GameState state, Player actor, ActionType action, String targetId) {
        switch (action) {
            case COUP -> {
                if (actor.getCoins() < 7) throw new IllegalStateException("Need 7 coins for Coup");
                if (targetId == null) throw new IllegalArgumentException("Coup requires a target");
            }
            case ASSASSINATE -> {
                if (actor.getCoins() < 3) throw new IllegalStateException("Need 3 coins to Assassinate");
                if (targetId == null) throw new IllegalArgumentException("Assassination requires a target");
            }
            case STEAL -> {
                if (targetId == null) throw new IllegalArgumentException("Steal requires a target");
                Player target = state.getPlayerById(targetId);
                if (target == null || target.isEliminated()) throw new IllegalArgumentException("Invalid target");
            }
            case INCOME, FOREIGN_AID, TAX, EXCHANGE -> {
            }
            default -> {
            }
        }
        if (actor.getCoins() >= 10 && action != ActionType.COUP) {
            throw new IllegalStateException("With 10+ coins you must perform a Coup");
        }
    }

    private boolean isValidBlock(ActionType action, CardType blockingCard) {
        return switch (action) {
            case FOREIGN_AID -> blockingCard == CardType.DUKE;
            case ASSASSINATE -> blockingCard == CardType.CONTESSA;
            case STEAL -> blockingCard == CardType.CAPTAIN || blockingCard == CardType.AMBASSADOR;
            default -> false;
        };
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

    public void removeGame(String roomId) {
        games.remove(roomId);
    }
}
