package com.boardgame.model.monopoly;

import lombok.Getter;
import lombok.Setter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
public class MonopolyGameState {
    private String roomId;
    private String boardType; // "VIETNAM" or "WORLD"
    private List<MonopolyPlayer> players;
    private int currentTurnIndex;
    private String phase; // ROLL, BUY, PAY_RENT, BUILD, END_TURN
    private int[] lastDice;
    private boolean hasRolled;
    private int doublesCount; // Consecutive doubles
    private List<String> logs;
    private Map<Integer, Property> board;

    public MonopolyGameState(String roomId, String boardType) {
        this.roomId = roomId;
        this.boardType = boardType != null ? boardType : "VIETNAM";
        this.players = new ArrayList<>();
        this.currentTurnIndex = 0;
        this.phase = "ROLL";
        this.lastDice = new int[]{0, 0};
        this.hasRolled = false;
        this.doublesCount = 0;
        this.logs = new ArrayList<>();
        this.board = new HashMap<>();
        initBoard();
    }

    private void initBoard() {
        if ("WORLD".equals(this.boardType)) {
            initWorldBoard();
        } else {
            initVietnamBoard();
        }
    }

    private void initVietnamBoard() {
        // Vietnamese Version Board Setup
        // GO, JAIL, FREE PARKING, GO TO JAIL are not properties, they are handled by logic
        
        // Brown
        board.put(1, new Property(1, "Buôn Ma Thuột", "BROWN", 600, 500, new int[]{20, 100, 300, 900, 1600, 2500}));
        board.put(3, new Property(3, "Đà Lạt", "BROWN", 600, 500, new int[]{40, 200, 600, 1800, 3200, 4500}));
        
        // Light Blue
        board.put(6, new Property(6, "Hội An", "LIGHT_BLUE", 1000, 500, new int[]{60, 300, 900, 2700, 4000, 5500}));
        board.put(8, new Property(8, "Huế", "LIGHT_BLUE", 1000, 500, new int[]{60, 300, 900, 2700, 4000, 5500}));
        board.put(9, new Property(9, "Nha Trang", "LIGHT_BLUE", 1200, 500, new int[]{80, 400, 1000, 3000, 4500, 6000}));

        // Pink
        board.put(11, new Property(11, "Vũng Tàu", "PINK", 1400, 1000, new int[]{100, 500, 1500, 4500, 6200, 7500}));
        board.put(13, new Property(13, "Biên Hoà", "PINK", 1400, 1000, new int[]{100, 500, 1500, 4500, 6200, 7500}));
        board.put(14, new Property(14, "Cần Thơ", "PINK", 1600, 1000, new int[]{120, 600, 1800, 5000, 7000, 9000}));

        // Orange
        board.put(16, new Property(16, "Quy Nhơn", "ORANGE", 1800, 1000, new int[]{140, 700, 2000, 5500, 7500, 9500}));
        board.put(18, new Property(18, "Phan Thiết", "ORANGE", 1800, 1000, new int[]{140, 700, 2000, 5500, 7500, 9500}));
        board.put(19, new Property(19, "Đà Nẵng", "ORANGE", 2000, 1000, new int[]{160, 800, 2200, 6000, 8000, 10000}));

        // Red
        board.put(21, new Property(21, "Hải Phòng", "RED", 2200, 1500, new int[]{180, 900, 2500, 7000, 8700, 10500}));
        board.put(23, new Property(23, "Vinh", "RED", 2200, 1500, new int[]{180, 900, 2500, 7000, 8700, 10500}));
        board.put(24, new Property(24, "Hạ Long", "RED", 2400, 1500, new int[]{200, 1000, 3000, 7500, 9200, 11000}));

        // Yellow
        board.put(26, new Property(26, "Thanh Hóa", "YELLOW", 2600, 1500, new int[]{220, 1100, 3300, 8000, 9700, 11500}));
        board.put(27, new Property(27, "Nam Định", "YELLOW", 2600, 1500, new int[]{220, 1100, 3300, 8000, 9700, 11500}));
        board.put(29, new Property(29, "Bắc Ninh", "YELLOW", 2800, 1500, new int[]{240, 1200, 3600, 8500, 10200, 12000}));

        // Green
        board.put(31, new Property(31, "Bình Dương", "GREEN", 3000, 2000, new int[]{260, 1300, 3900, 9000, 11000, 12700}));
        board.put(32, new Property(32, "Đồng Nai", "GREEN", 3000, 2000, new int[]{260, 1300, 3900, 9000, 11000, 12700}));
        board.put(34, new Property(34, "Phú Quốc", "GREEN", 3200, 2000, new int[]{280, 1500, 4500, 10000, 12000, 14000}));

        // Dark Blue
        board.put(37, new Property(37, "Hà Nội", "DARK_BLUE", 3500, 2000, new int[]{350, 1750, 5000, 11000, 13000, 15000}));
        board.put(39, new Property(39, "TP HCM", "DARK_BLUE", 4000, 2000, new int[]{500, 2000, 6000, 14000, 17000, 20000}));

        // Stations
        board.put(5, new Property(5, "Sân Bay Nội Bài", "STATION", 2000, 0, new int[]{250, 500, 1000, 2000, 0, 0}));
        board.put(15, new Property(15, "Sân Bay Tân Sơn Nhất", "STATION", 2000, 0, new int[]{250, 500, 1000, 2000, 0, 0}));
        board.put(25, new Property(25, "Sân Bay Đà Nẵng", "STATION", 2000, 0, new int[]{250, 500, 1000, 2000, 0, 0}));
        board.put(35, new Property(35, "Sân Bay Phú Quốc", "STATION", 2000, 0, new int[]{250, 500, 1000, 2000, 0, 0}));

        // Utilities
        board.put(12, new Property(12, "Điện Lực EVN", "UTILITY", 1500, 0, new int[]{0, 0, 0, 0, 0, 0})); // Multiplier based
        board.put(28, new Property(28, "Cấp Nước Sawa", "UTILITY", 1500, 0, new int[]{0, 0, 0, 0, 0, 0}));
    }

    private void initWorldBoard() {
        // Brown
        board.put(1, new Property(1, "Mediterranean Ave", "BROWN", 600, 500, new int[]{20, 100, 300, 900, 1600, 2500}));
        board.put(3, new Property(3, "Baltic Avenue", "BROWN", 600, 500, new int[]{40, 200, 600, 1800, 3200, 4500}));
        
        // Light Blue
        board.put(6, new Property(6, "Oriental Ave", "LIGHT_BLUE", 1000, 500, new int[]{60, 300, 900, 2700, 4000, 5500}));
        board.put(8, new Property(8, "Vermont Ave", "LIGHT_BLUE", 1000, 500, new int[]{60, 300, 900, 2700, 4000, 5500}));
        board.put(9, new Property(9, "Connecticut", "LIGHT_BLUE", 1200, 500, new int[]{80, 400, 1000, 3000, 4500, 6000}));

        // Pink
        board.put(11, new Property(11, "St. Charles", "PINK", 1400, 1000, new int[]{100, 500, 1500, 4500, 6200, 7500}));
        board.put(13, new Property(13, "States Ave", "PINK", 1400, 1000, new int[]{100, 500, 1500, 4500, 6200, 7500}));
        board.put(14, new Property(14, "Virginia Ave", "PINK", 1600, 1000, new int[]{120, 600, 1800, 5000, 7000, 9000}));

        // Orange
        board.put(16, new Property(16, "St. James", "ORANGE", 1800, 1000, new int[]{140, 700, 2000, 5500, 7500, 9500}));
        board.put(18, new Property(18, "Tennessee", "ORANGE", 1800, 1000, new int[]{140, 700, 2000, 5500, 7500, 9500}));
        board.put(19, new Property(19, "New York", "ORANGE", 2000, 1000, new int[]{160, 800, 2200, 6000, 8000, 10000}));

        // Red
        board.put(21, new Property(21, "Kentucky", "RED", 2200, 1500, new int[]{180, 900, 2500, 7000, 8700, 10500}));
        board.put(23, new Property(23, "Indiana", "RED", 2200, 1500, new int[]{180, 900, 2500, 7000, 8700, 10500}));
        board.put(24, new Property(24, "Illinois", "RED", 2400, 1500, new int[]{200, 1000, 3000, 7500, 9200, 11000}));

        // Yellow
        board.put(26, new Property(26, "Atlantic", "YELLOW", 2600, 1500, new int[]{220, 1100, 3300, 8000, 9700, 11500}));
        board.put(27, new Property(27, "Ventnor", "YELLOW", 2600, 1500, new int[]{220, 1100, 3300, 8000, 9700, 11500}));
        board.put(29, new Property(29, "Marvin Grdn", "YELLOW", 2800, 1500, new int[]{240, 1200, 3600, 8500, 10200, 12000}));

        // Green
        board.put(31, new Property(31, "Pacific Ave", "GREEN", 3000, 2000, new int[]{260, 1300, 3900, 9000, 11000, 12700}));
        board.put(32, new Property(32, "N. Carolina", "GREEN", 3000, 2000, new int[]{260, 1300, 3900, 9000, 11000, 12700}));
        board.put(34, new Property(34, "Pennsylvania", "GREEN", 3200, 2000, new int[]{280, 1500, 4500, 10000, 12000, 14000}));

        // Dark Blue
        board.put(37, new Property(37, "Park Place", "DARK_BLUE", 3500, 2000, new int[]{350, 1750, 5000, 11000, 13000, 15000}));
        board.put(39, new Property(39, "Boardwalk", "DARK_BLUE", 4000, 2000, new int[]{500, 2000, 6000, 14000, 17000, 20000}));

        // Stations
        board.put(5, new Property(5, "Reading RR", "STATION", 2000, 0, new int[]{250, 500, 1000, 2000, 0, 0}));
        board.put(15, new Property(15, "Penn RR", "STATION", 2000, 0, new int[]{250, 500, 1000, 2000, 0, 0}));
        board.put(25, new Property(25, "B. & O. RR", "STATION", 2000, 0, new int[]{250, 500, 1000, 2000, 0, 0}));
        board.put(35, new Property(35, "Short Line", "STATION", 2000, 0, new int[]{250, 500, 1000, 2000, 0, 0}));

        // Utilities
        board.put(12, new Property(12, "Electric Co", "UTILITY", 1500, 0, new int[]{0, 0, 0, 0, 0, 0})); // Multiplier based
        board.put(28, new Property(28, "Water Works", "UTILITY", 1500, 0, new int[]{0, 0, 0, 0, 0, 0}));
    }

    public void addLog(String message) {
        logs.add(message);
        if (logs.size() > 50) logs.remove(0);
    }
}
