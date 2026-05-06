package com.boardgame.service;

import com.boardgame.model.uno.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class UnoGameService {

    private final Map<String, UnoGameState> games = new ConcurrentHashMap<>();

    public void removeGame(String roomId) {
        games.remove(roomId);
    }

    public UnoGameState getGame(String roomId) {
        return games.get(roomId);
    }

    public UnoGameState startGame(String roomId, List<UnoPlayer> players) {
        UnoGameState state = new UnoGameState();
        state.setRoomId(roomId);
        state.setPlayers(new ArrayList<>(players));

        // 1. Build Deck
        List<UnoCard> deck = createUnoDeck();
        Collections.shuffle(deck);

        // 2. Deal 7 cards
        for (UnoPlayer p : state.getPlayers()) {
            p.setHand(new ArrayList<>());
            for (int i = 0; i < 7; i++) {
                p.getHand().add(deck.remove(0));
            }
        }

        // 3. Initial discard
        UnoCard first;
        do {
            first = deck.remove(0);
            if (first.getColor() == UnoColor.WILD) {
                deck.add(first);
                Collections.shuffle(deck);
            } else {
                state.getDiscardPile().add(0, first);
                state.setActiveColor(first.getColor());
                state.setActiveValue(first.getValue());
                break;
            }
        } while (true);

        state.setDrawPile(deck);
        state.setPhase(UnoGameState.Phase.PLAYER_TURN);
        state.setCurrentPlayerIndex(new Random().nextInt(players.size()));

        state.addLog("game.logs.started", Map.of("player", state.getCurrentPlayer().getUsername()));
        games.put(roomId, state);
        return state;
    }

    private List<UnoCard> createUnoDeck() {
        List<UnoCard> deck = new ArrayList<>();
        int idCount = 0;
        for (UnoColor color : new UnoColor[]{UnoColor.RED, UnoColor.YELLOW, UnoColor.GREEN, UnoColor.BLUE}) {
            // One 0
            deck.add(new UnoCard("c" + (idCount++), color, UnoValue.ZERO));
            // Two of 1-9, Skip, Reverse, DrawTwo
            for (int i = 0; i < 2; i++) {
                deck.add(new UnoCard("c" + (idCount++), color, UnoValue.ONE));
                deck.add(new UnoCard("c" + (idCount++), color, UnoValue.TWO));
                deck.add(new UnoCard("c" + (idCount++), color, UnoValue.THREE));
                deck.add(new UnoCard("c" + (idCount++), color, UnoValue.FOUR));
                deck.add(new UnoCard("c" + (idCount++), color, UnoValue.FIVE));
                deck.add(new UnoCard("c" + (idCount++), color, UnoValue.SIX));
                deck.add(new UnoCard("c" + (idCount++), color, UnoValue.SEVEN));
                deck.add(new UnoCard("c" + (idCount++), color, UnoValue.EIGHT));
                deck.add(new UnoCard("c" + (idCount++), color, UnoValue.NINE));
                deck.add(new UnoCard("c" + (idCount++), color, UnoValue.SKIP));
                deck.add(new UnoCard("c" + (idCount++), color, UnoValue.REVERSE));
                deck.add(new UnoCard("c" + (idCount++), color, UnoValue.DRAW_TWO));
            }
        }
        // Wilds
        for (int i = 0; i < 4; i++) {
            deck.add(new UnoCard("c" + (idCount++), UnoColor.WILD, UnoValue.WILD));
            deck.add(new UnoCard("c" + (idCount++), UnoColor.WILD, UnoValue.WILD_DRAW_FOUR));
        }
        return deck;
    }

    public UnoGameState playCard(String roomId, String playerId, String cardId, UnoColor newColor) {
        UnoGameState state = games.get(roomId);
        UnoPlayer player = state.getPlayerById(playerId);
        UnoCard card = player.getHand().stream().filter(c -> c.getId().equals(cardId)).findFirst().orElse(null);

        if (card == null) throw new IllegalArgumentException("Card not in hand");

        // Validate match
        boolean canPlay = (card.getColor() == UnoColor.WILD) || 
                          (card.getColor() == state.getActiveColor()) || 
                          (card.getValue() == state.getActiveValue());
        
        if (!canPlay) throw new IllegalArgumentException("Card doesn't match");

        player.getHand().remove(card);
        state.getDiscardPile().add(0, card);
        state.setActiveValue(card.getValue());
        
        if (card.getColor() == UnoColor.WILD) {
            state.setActiveColor(newColor);
        } else {
            state.setActiveColor(card.getColor());
        }

        // Apply effects
        applyCardEffect(state, card);

        // Check win
        if (player.getHand().isEmpty()) {
            state.setPhase(UnoGameState.Phase.GAME_OVER);
            state.setWinnerId(player.getId());
            state.addLog("game.logs.winner", Map.of("player", player.getUsername()));
        } else {
            state.advanceTurn();
        }

        return state;
    }

    private void applyCardEffect(UnoGameState state, UnoCard card) {
        switch (card.getValue()) {
            case SKIP -> state.advanceTurn();
            case REVERSE -> {
                if (state.getPlayers().size() == 2) {
                    state.advanceTurn();
                } else {
                    state.setClockwise(!state.isClockwise());
                }
            }
            case DRAW_TWO -> {
                state.advanceTurn();
                drawCards(state, state.getCurrentPlayer(), 2);
            }
            case WILD_DRAW_FOUR -> {
                state.advanceTurn();
                drawCards(state, state.getCurrentPlayer(), 4);
            }
            default -> {}
        }
    }

    public UnoGameState drawCard(String roomId, String playerId) {
        UnoGameState state = games.get(roomId);
        UnoPlayer player = state.getCurrentPlayer();
        drawCards(state, player, 1);
        state.advanceTurn();
        return state;
    }

    private void drawCards(UnoGameState state, UnoPlayer player, int count) {
        for (int i = 0; i < count; i++) {
            if (state.getDrawPile().isEmpty()) {
                if (state.getDiscardPile().size() <= 1) break;
                UnoCard top = state.getDiscardPile().remove(0);
                List<UnoCard> rest = new ArrayList<>(state.getDiscardPile());
                state.getDiscardPile().clear();
                state.getDiscardPile().add(top);
                Collections.shuffle(rest);
                state.setDrawPile(rest);
            }
            if (!state.getDrawPile().isEmpty()) {
                player.getHand().add(state.getDrawPile().remove(0));
            }
        }
    }
}
