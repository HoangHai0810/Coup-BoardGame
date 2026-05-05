package com.boardgame.model.uno;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UnoCard {
    private String id;
    private UnoColor color;
    private UnoValue value;

    public boolean matches(UnoCard other) {
        if (this.color == UnoColor.WILD || other.color == UnoColor.WILD) return true;
        return this.color == other.color || this.value == other.value;
    }
}
