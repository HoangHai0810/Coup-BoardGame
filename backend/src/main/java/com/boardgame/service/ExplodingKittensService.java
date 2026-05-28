package com.boardgame.service;

import com.boardgame.model.kittens.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
@RequiredArgsConstructor
public class ExplodingKittensService {

    private final RatingService ratingService;
    private final Map<String, KittensGameState> games = new ConcurrentHashMap<>();

    public void removeGame(String roomId) {
        games.remove(roomId);
    }

    public KittensGameState getGame(String roomId) {
        return games.get(roomId);
    }

    public KittensGameState startGame(String roomId, List<KittensPlayer> players) {
        KittensGameState state = new KittensGameState();
        state.setRoomId(roomId);
        state.setPlayers(new ArrayList<>(players));
        
        // 1. Build deck without Kittens and Defuses
        List<KittensCardType> deck = new ArrayList<>();
        addCards(deck, KittensCardType.ATTACK, 4);
        addCards(deck, KittensCardType.SKIP, 4);
        addCards(deck, KittensCardType.FAVOR, 4);
        addCards(deck, KittensCardType.SHUFFLE, 4);
        addCards(deck, KittensCardType.SEE_THE_FUTURE, 5);
        addCards(deck, KittensCardType.NOPE, 5);
        addCards(deck, KittensCardType.CAT_BEARD, 4);
        addCards(deck, KittensCardType.CAT_TACO, 4);
        addCards(deck, KittensCardType.CAT_RAINBOW, 4);
        addCards(deck, KittensCardType.CAT_MELON, 4);
        Collections.shuffle(deck);

        // 2. Deal 4 cards + 1 Defuse to each player (Total 5)
        for (KittensPlayer p : state.getPlayers()) {
            p.setHand(new ArrayList<>());
            p.getHand().add(KittensCardType.DEFUSE);
            for (int i = 0; i < 4; i++) {
                p.getHand().add(deck.remove(0));
            }
        }

        // 3. Add Exploding Kittens (Players - 1)
        for (int i = 0; i < players.size() - 1; i++) {
            deck.add(KittensCardType.EXPLODING_KITTEN);
        }

        // 4. Add remaining Defuses
        addCards(deck, KittensCardType.DEFUSE, 6 - players.size());
        
        Collections.shuffle(deck);
        state.setDrawPile(deck);
        state.setPhase(KittensGameState.Phase.PLAYER_TURN);
        state.setCurrentPlayerIndex(new Random().nextInt(players.size()));

        state.addLog("game.logs.started", Map.of("player", state.getCurrentPlayer().getUsername()));
        games.put(roomId, state);
        return state;
    }

    private void addCards(List<KittensCardType> deck, KittensCardType type, int count) {
        for (int i = 0; i < count; i++) deck.add(type);
    }

    public KittensGameState playCard(String roomId, String playerId, List<KittensCardType> cardTypes, String targetId, KittensCardType requestedCard) {
        KittensGameState state = games.get(roomId);
        KittensPlayer player = state.getPlayerById(playerId);
        
        for (KittensCardType type : cardTypes) {
            if (!player.hasCard(type)) throw new IllegalArgumentException("You don't have these cards");
            player.removeCard(type);
            state.getDiscardPile().add(0, type);
        }

        if (cardTypes.size() == 1) {
            KittensCardType cardType = cardTypes.get(0);
            switch (cardType) {
                case SKIP -> {
                    state.addLog("kittens.logs.skip", Map.of("player", player.getUsername()));
                    state.setFutureCards(new ArrayList<>());
                    state.advanceTurn();
                }
                case ATTACK -> {
                    state.addLog("kittens.logs.attack", Map.of("player", player.getUsername()));
                    state.setFutureCards(new ArrayList<>());
                    state.setTurnsLeft(state.getTurnsLeft() + 2); // Rule: Next player must take 2 turns
                    state.advanceTurn();
                }
                case SHUFFLE -> {
                    state.addLog("kittens.logs.shuffle", Map.of("player", player.getUsername()));
                    Collections.shuffle(state.getDrawPile());
                    state.setFutureCards(new ArrayList<>());
                }
                case SEE_THE_FUTURE -> {
                    state.addLog("kittens.logs.see_future", Map.of("player", player.getUsername()));
                    List<KittensCardType> pile = state.getDrawPile();
                    state.setFutureCards(new ArrayList<>(pile.subList(0, Math.min(3, pile.size()))));
                }
                case FAVOR -> {
                    state.addLog("kittens.logs.favor", Map.of("player", player.getUsername(), "target", state.getPlayerById(targetId).getUsername()));
                    state.setPhase(KittensGameState.Phase.AWAITING_FAVOR);
                    state.setFavorTargetId(targetId);
                    state.setFavorRequesterId(playerId);
                }
                default -> {}
            }
        } else if (cardTypes.size() == 2 && cardTypes.get(0) == cardTypes.get(1)) {
            // Combo 2: Steal random
            KittensPlayer target = state.getPlayerById(targetId);
            if (!target.getHand().isEmpty()) {
                KittensCardType stolen = target.getHand().remove(new Random().nextInt(target.getHand().size()));
                player.getHand().add(stolen);
                state.addLog("kittens.logs.combo2", Map.of("player", player.getUsername(), "target", target.getUsername()));
            }
        } else if (cardTypes.size() == 3 && cardTypes.get(0) == cardTypes.get(1) && cardTypes.get(1) == cardTypes.get(2)) {
            // Combo 3: Name card and steal
            KittensPlayer target = state.getPlayerById(targetId);
            if (target.hasCard(requestedCard)) {
                target.removeCard(requestedCard);
                player.getHand().add(requestedCard);
                state.addLog("kittens.logs.combo3_success", Map.of("player", player.getUsername(), "target", target.getUsername(), "card", requestedCard.toString()));
            } else {
                state.addLog("kittens.logs.combo3_fail", Map.of("player", player.getUsername(), "target", target.getUsername()));
            }
        } else if (cardTypes.size() == 5) {
            // Combo 5: Pick from discard
            if (requestedCard != null && state.getDiscardPile().contains(requestedCard)) {
                state.getDiscardPile().remove(requestedCard);
                player.getHand().add(requestedCard);
                state.addLog("kittens.logs.combo5", Map.of("player", player.getUsername(), "card", requestedCard.toString()));
            }
        }
        return state;
    }

    public KittensGameState giveCard(String roomId, String targetId, KittensCardType card) {
        KittensGameState state = games.get(roomId);
        KittensPlayer giver = state.getPlayerById(targetId);
        KittensPlayer receiver = state.getPlayerById(state.getFavorRequesterId());

        if (giver.hasCard(card)) {
            giver.removeCard(card);
            receiver.getHand().add(card);
            state.addLog("kittens.logs.favor_received", Map.of("player", receiver.getUsername(), "target", giver.getUsername()));
            state.setPhase(KittensGameState.Phase.PLAYER_TURN);
            state.setFavorTargetId(null);
            state.setFavorRequesterId(null);
        }
        return state;
    }

    public KittensGameState drawCard(String roomId, String playerId) {
        KittensGameState state = games.get(roomId);
        KittensPlayer player = state.getCurrentPlayer();
        
        if (state.getDrawPile().isEmpty()) return state;
        
        state.setFutureCards(new ArrayList<>());
        KittensCardType drawn = state.getDrawPile().remove(0);
        state.addLog("kittens.logs.draw", Map.of("player", player.getUsername()));
        
        if (drawn == KittensCardType.EXPLODING_KITTEN) {
            if (player.hasCard(KittensCardType.DEFUSE)) {
                state.setPhase(KittensGameState.Phase.EXPLODING);
                state.addLog("kittens.logs.exploding_defuse", Map.of("player", player.getUsername()));
            } else {
                player.setExploded(true);
                state.addLog("kittens.logs.exploded", Map.of("player", player.getUsername()));
                state.getDiscardPile().add(0, KittensCardType.EXPLODING_KITTEN);
                checkWinner(state);
                if (state.getPhase() != KittensGameState.Phase.GAME_OVER) {
                    state.advanceTurn();
                }
            }
        } else {
            player.getHand().add(drawn);
            state.advanceTurn();
        }
        return state;
    }

    public KittensGameState defuse(String roomId, String playerId, int position) {
        KittensGameState state = games.get(roomId);
        KittensPlayer player = state.getPlayerById(playerId);
        
        player.removeCard(KittensCardType.DEFUSE);
        state.getDiscardPile().add(0, KittensCardType.DEFUSE);
        
        int index = Math.min(position, state.getDrawPile().size());
        state.getDrawPile().add(index, KittensCardType.EXPLODING_KITTEN);
        
        state.setFutureCards(new ArrayList<>());
        state.setPhase(KittensGameState.Phase.PLAYER_TURN);
        state.advanceTurn();
        return state;
    }

    private void checkWinner(KittensGameState state) {
        List<KittensPlayer> alive = state.getPlayers().stream().filter(p -> !p.isExploded()).toList();
        if (alive.size() == 1) {
            state.setPhase(KittensGameState.Phase.GAME_OVER);
            state.setWinnerId(alive.get(0).getId());
            state.addLog("game.logs.winner", Map.of("player", alive.get(0).getUsername()));
            
            List<String> allPlayerIds = state.getPlayers().stream().map(KittensPlayer::getId).toList();
            ratingService.processGameOver("KITTENS", allPlayerIds, alive.get(0).getId());
        }
    }
}
