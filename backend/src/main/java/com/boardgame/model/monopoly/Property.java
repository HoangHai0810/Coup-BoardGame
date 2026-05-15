package com.boardgame.model.monopoly;

import lombok.Data;

@Data
public class Property {
    private int id; // Ô thứ mấy trên bàn cờ (0-39)
    private String name;
    private String colorGroup; // BROWN, LIGHT_BLUE, PINK, ORANGE, RED, YELLOW, GREEN, DARK_BLUE, STATION, UTILITY
    private int price;
    private int housePrice;
    private int[] rentPrices; // [Base, 1 House, 2 Houses, 3 Houses, 4 Houses, Hotel]
    private String ownerId;
    private int housesBuilt; // 0-4 (Houses), 5 (Hotel)
    private boolean isMortgaged;

    public Property() {}

    public Property(int id, String name, String colorGroup, int price, int housePrice, int[] rentPrices) {
        this.id = id;
        this.name = name;
        this.colorGroup = colorGroup;
        this.price = price;
        this.housePrice = housePrice;
        this.rentPrices = rentPrices;
        this.ownerId = null;
        this.housesBuilt = 0;
        this.isMortgaged = false;
    }

    public int getCurrentRent() {
        if (ownerId == null) return 0;
        return rentPrices[housesBuilt];
    }
}
