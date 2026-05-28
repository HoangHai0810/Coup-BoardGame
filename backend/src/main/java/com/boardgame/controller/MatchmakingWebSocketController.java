package com.boardgame.controller;

import com.boardgame.entity.UserEntity;
import com.boardgame.service.MatchmakingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
@Slf4j
public class MatchmakingWebSocketController {

    private final MatchmakingService matchmakingService;

    @MessageMapping("/matchmaking/join/{gameType}")
    public void joinQueue(@DestinationVariable String gameType, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        matchmakingService.joinQueue(user.getId().toString(), gameType);
    }

    @MessageMapping("/matchmaking/leave/{gameType}")
    public void leaveQueue(@DestinationVariable String gameType, Authentication auth) {
        UserEntity user = (UserEntity) auth.getPrincipal();
        matchmakingService.leaveQueue(user.getId().toString(), gameType);
    }
}
