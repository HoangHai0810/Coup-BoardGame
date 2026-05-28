package com.boardgame.service;

import com.boardgame.model.monopoly.MonopolyGameState;
import com.boardgame.model.monopoly.MonopolyPlayer;
import com.boardgame.model.monopoly.Property;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class MonopolyService {

    private final RatingService ratingService;
    private final Map<String, MonopolyGameState> activeGames = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public MonopolyGameState startGame(String roomId, String boardType, List<MonopolyPlayer> players) {
        MonopolyGameState state = new MonopolyGameState(roomId, boardType);
        state.setPlayers(players);
        state.addLog("Trò chơi Cờ Tỉ Phú bắt đầu!");
        activeGames.put(roomId, state);
        return state;
    }

    public MonopolyGameState getGame(String roomId) {
        return activeGames.get(roomId);
    }

    public MonopolyGameState rollDice(String roomId, String playerId) {
        MonopolyGameState state = activeGames.get(roomId);
        if (state == null || !state.getPhase().equals("ROLL")) return state;

        MonopolyPlayer player = state.getPlayers().get(state.getCurrentTurnIndex());
        if (!player.getId().equals(playerId)) return state;

        int d1 = random.nextInt(6) + 1;
        int d2 = random.nextInt(6) + 1;
        state.setLastDice(new int[]{d1, d2});
        state.setHasRolled(true);
        state.addLog(player.getUsername() + " đổ xúc xắc được " + (d1 + d2));

        if (player.isInJail()) {
            if (d1 == d2) {
                player.setInJail(false);
                player.setTurnsInJail(0);
                state.addLog(player.getUsername() + " đổ đôi và thoát khỏi tù!");
            } else {
                player.setTurnsInJail(player.getTurnsInJail() + 1);
                if (player.getTurnsInJail() >= 3) {
                    player.deductMoney(500);
                    player.setInJail(false);
                    player.setTurnsInJail(0);
                    state.addLog(player.getUsername() + " nộp phạt 500k để ra tù.");
                    checkBankruptcy(state, player, null);
                    if (player.isBankrupt()) {
                        return state;
                    }
                } else {
                    state.setPhase("END_TURN");
                    return state;
                }
            }
        }

        if (d1 == d2) {
            state.setDoublesCount(state.getDoublesCount() + 1);
            if (state.getDoublesCount() == 3) {
                player.setInJail(true);
                player.setPosition(10); // Jail position
                state.setPhase("END_TURN");
                state.addLog(player.getUsername() + " vào tù vì đổ đôi 3 lần liên tiếp!");
                return state;
            }
        }

        int newPos = (player.getPosition() + d1 + d2) % 40;
        if (newPos < player.getPosition()) {
            player.addMoney(2000);
            state.addLog(player.getUsername() + " đi qua Trạm Bắt Đầu, nhận 2000k.");
        }
        player.setPosition(newPos);

        Property p = state.getBoard().get(newPos);
        if (p != null) {
            if (p.getOwnerId() == null) {
                state.setPhase("BUY");
                state.addLog(player.getUsername() + " đến ô " + p.getName() + ", có thể mua với giá " + p.getPrice() + "k.");
            } else if (!p.getOwnerId().equals(player.getId())) {
                payRent(state, player, p);
                if (player.isBankrupt()) {
                    state.setPhase("END_TURN");
                } else {
                    state.setPhase(d1 == d2 ? "ROLL" : "END_TURN");
                }
            } else {
                state.setPhase(d1 == d2 ? "ROLL" : "END_TURN");
            }
        } else {
            // Handle special spaces (Chance, Community Chest, Tax, Go To Jail)
            if (newPos == 30) { // Go to Jail
                player.setInJail(true);
                player.setPosition(10);
                state.addLog(player.getUsername() + " bị bắt vào tù!");
                state.setPhase("END_TURN");
            } else if (newPos == 4) { // Income Tax
                player.deductMoney(2000);
                state.addLog(player.getUsername() + " đóng Thuế Thu Nhập 2000k.");
                checkBankruptcy(state, player, null);
                state.setPhase(player.isBankrupt() ? "END_TURN" : (d1 == d2 ? "ROLL" : "END_TURN"));
            } else if (newPos == 38) { // Luxury Tax
                player.deductMoney(1000);
                state.addLog(player.getUsername() + " đóng Thuế Xa Xỉ 1000k.");
                checkBankruptcy(state, player, null);
                state.setPhase(player.isBankrupt() ? "END_TURN" : (d1 == d2 ? "ROLL" : "END_TURN"));
            } else {
                // Free parking, Chance, etc.
                state.setPhase(d1 == d2 ? "ROLL" : "END_TURN");
            }
        }

        return state;
    }

    private void payRent(MonopolyGameState state, MonopolyPlayer payer, Property p) {
        MonopolyPlayer owner = state.getPlayers().stream().filter(pl -> pl.getId().equals(p.getOwnerId())).findFirst().orElse(null);
        if (owner != null && !owner.isInJail()) {
            int rent = p.getCurrentRent();
            payer.deductMoney(rent);
            owner.addMoney(rent);
            state.addLog(payer.getUsername() + " trả " + rent + "k tiền thuê cho " + owner.getUsername());
            checkBankruptcy(state, payer, owner);
        }
    }

    public MonopolyGameState buyProperty(String roomId, String playerId) {
        MonopolyGameState state = activeGames.get(roomId);
        if (state == null || !state.getPhase().equals("BUY")) return state;

        MonopolyPlayer player = state.getPlayers().get(state.getCurrentTurnIndex());
        if (!player.getId().equals(playerId)) return state;

        Property p = state.getBoard().get(player.getPosition());
        if (p != null && p.getOwnerId() == null && player.getMoney() >= p.getPrice()) {
            player.deductMoney(p.getPrice());
            p.setOwnerId(player.getId());
            player.getPropertiesOwned().add(p.getId());
            state.addLog(player.getUsername() + " đã mua " + p.getName());
        }

        state.setPhase(state.getLastDice()[0] == state.getLastDice()[1] ? "ROLL" : "END_TURN");
        return state;
    }

    public MonopolyGameState buildHouse(String roomId, String playerId, int propertyId) {
        MonopolyGameState state = activeGames.get(roomId);
        if (state == null) return null;

        MonopolyPlayer player = state.getPlayers().stream().filter(p -> p.getId().equals(playerId)).findFirst().orElse(null);
        if (player == null || player.isBankrupt()) return state;

        Property p = state.getBoard().get(propertyId);
        if (p == null || !playerId.equals(p.getOwnerId())) return state;

        if (p.getHousePrice() == 0 || p.getHousesBuilt() >= 5) {
            return state; // Can't build or already maxed (hotel)
        }

        // Check if player owns all properties in this color group
        String group = p.getColorGroup();
        boolean ownsAll = state.getBoard().values().stream()
                .filter(prop -> prop.getColorGroup().equals(group))
                .allMatch(prop -> playerId.equals(prop.getOwnerId()));

        if (!ownsAll) {
            state.addLog("Bạn phải sở hữu tất cả các tài sản cùng màu trước khi xây nhà!");
            return state;
        }

        if (player.getMoney() < p.getHousePrice()) {
            state.addLog("Không đủ tiền để xây nhà trên " + p.getName());
            return state;
        }

        player.deductMoney(p.getHousePrice());
        p.setHousesBuilt(p.getHousesBuilt() + 1);
        if (p.getHousesBuilt() == 5) {
            state.addLog(player.getUsername() + " đã nâng cấp lên Khách Sạn trên " + p.getName() + "!");
        } else {
            state.addLog(player.getUsername() + " đã xây thêm 1 ngôi nhà trên " + p.getName() + " (Tổng: " + p.getHousesBuilt() + " nhà).");
        }

        return state;
    }

    public MonopolyGameState endTurn(String roomId, String playerId) {
        MonopolyGameState state = activeGames.get(roomId);
        if (state == null || (!state.getPhase().equals("END_TURN") && !state.getPhase().equals("BUY"))) return state;

        MonopolyPlayer player = state.getPlayers().get(state.getCurrentTurnIndex());
        if (!player.getId().equals(playerId)) return state;

        state.setDoublesCount(0);
        state.setHasRolled(false);
        state.setPhase("ROLL");

        do {
            state.setCurrentTurnIndex((state.getCurrentTurnIndex() + 1) % state.getPlayers().size());
        } while (state.getPlayers().get(state.getCurrentTurnIndex()).isBankrupt());

        state.addLog("Đến lượt của " + state.getPlayers().get(state.getCurrentTurnIndex()).getUsername());
        return state;
    }

    private void checkBankruptcy(MonopolyGameState state, MonopolyPlayer player, MonopolyPlayer creditor) {
        if (player.getMoney() < 0) {
            player.setBankrupt(true);
            player.setMoney(0);
            state.addLog("💥 " + player.getUsername() + " đã bị phá sản!");

            // Release or transfer properties
            List<Integer> properties = new ArrayList<>(player.getPropertiesOwned());
            player.getPropertiesOwned().clear();
            for (Integer propId : properties) {
                Property prop = state.getBoard().get(propId);
                if (prop != null) {
                    if (creditor != null) {
                        prop.setOwnerId(creditor.getId());
                        creditor.getPropertiesOwned().add(propId);
                        state.addLog("🏠 Tài sản " + prop.getName() + " được chuyển giao cho " + creditor.getUsername());
                    } else {
                        prop.setOwnerId(null);
                        prop.setHousesBuilt(0);
                        state.addLog("🏠 Tài sản " + prop.getName() + " đã được trả về ngân hàng.");
                    }
                }
            }

            // Check if game over
            long activePlayersCount = state.getPlayers().stream().filter(p -> !p.isBankrupt()).count();
            if (activePlayersCount <= 1) {
                state.setPhase("GAME_OVER");
                MonopolyPlayer winner = state.getPlayers().stream().filter(p -> !p.isBankrupt()).findFirst().orElse(null);
                if (winner != null) {
                    state.addLog("🏆 Trò chơi kết thúc! Người chiến thắng là " + winner.getUsername() + "!");
                    List<String> allPlayerIds = state.getPlayers().stream().map(MonopolyPlayer::getId).toList();
                    ratingService.processGameOver("MONOPOLY", allPlayerIds, winner.getId());
                } else {
                    state.addLog("🏆 Trò chơi kết thúc!");
                }
            } else if (state.getPlayers().get(state.getCurrentTurnIndex()).getId().equals(player.getId())) {
                // Auto advance turn since the active player went bankrupt
                state.setDoublesCount(0);
                state.setHasRolled(false);
                state.setPhase("ROLL");
                do {
                    state.setCurrentTurnIndex((state.getCurrentTurnIndex() + 1) % state.getPlayers().size());
                } while (state.getPlayers().get(state.getCurrentTurnIndex()).isBankrupt());
                state.addLog("Đến lượt của " + state.getPlayers().get(state.getCurrentTurnIndex()).getUsername());
            }
        }
    }

    public void removeGame(String roomId) {
        activeGames.remove(roomId);
    }
}
