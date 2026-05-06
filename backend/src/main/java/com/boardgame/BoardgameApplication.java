package com.boardgame;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BoardgameApplication {
    public static void main(String[] args) {
        SpringApplication.run(BoardgameApplication.class, args);
    }
}
