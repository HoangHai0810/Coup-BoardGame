package com.boardgame.model;

import lombok.Data;

@Data
public class PendingAction {
    private final String actorId;
    private final ActionType actionType;
    private final String targetId;

    private String blockerId;
    private CardType blockingCard;
    private String challengerId;

    private boolean challenged = false;
    private boolean blocked = false;

    private CardType drawnCard1;
    private CardType drawnCard2;

    public PendingAction(String actorId, ActionType actionType, String targetId) {
        this.actorId = actorId;
        this.actionType = actionType;
        this.targetId = targetId;
    }
}
