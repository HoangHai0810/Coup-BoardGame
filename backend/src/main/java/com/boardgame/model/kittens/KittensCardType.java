package com.boardgame.model.kittens;

import lombok.Getter;

@Getter
public enum KittensCardType {
    EXPLODING_KITTEN("Exploding Kitten", "Mèo Nổ", "BOOM! You explode unless you have a Defuse."),
    DEFUSE("Defuse", "Gỡ Bom", "Avoid exploding. Put the kitten back in the deck."),
    ATTACK("Attack", "Tấn Công", "End your turn without drawing. Next player takes 2 turns."),
    SKIP("Skip", "Bỏ Lượt", "End your turn without drawing."),
    FAVOR("Favor", "Ban Ân", "Force another player to give you a card of their choice."),
    SHUFFLE("Shuffle", "Xáo Bài", "Shuffle the draw pile."),
    SEE_THE_FUTURE("See the Future", "Nhìn Trước Tương Lai", "View the top 3 cards of the deck."),
    NOPE("Nope", "Chặn", "Stop any action (except Exploding Kitten or Defuse)."),
    CAT_BEARD("Beard Cat", "Mèo Râu", "Collect 2 of the same cat cards to steal a random card."),
    CAT_TACO("Taco Cat", "Mèo Taco", "Collect 2 of the same cat cards to steal a random card."),
    CAT_RAINBOW("Rainbow Cat", "Mèo Cầu Vồng", "Collect 2 of the same cat cards to steal a random card."),
    CAT_MELON("Melon Cat", "Mèo Dưa Hấu", "Collect 2 of the same cat cards to steal a random card.");

    private final String englishName;
    private final String vietnameseName;
    private final String description;

    KittensCardType(String en, String vi, String desc) {
        this.englishName = en;
        this.vietnameseName = vi;
        this.description = desc;
    }
}
