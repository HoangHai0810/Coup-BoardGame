package com.boardgame.controller;

import com.boardgame.entity.*;
import com.boardgame.repository.*;

import com.boardgame.entity.UserEntity;
import com.boardgame.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getFriends(@AuthenticationPrincipal UserEntity me) {
        List<Map<String, Object>> friends = friendshipRepository.findAcceptedFriendships(me)
                .stream()
                .map(f -> {
                    UserEntity friend = f.getRequester().getId().equals(me.getId())
                            ? f.getAddressee() : f.getRequester();
                    return Map.of(
                            "id", (Object) friend.getId().toString(),
                            "username", friend.getUsername(),
                            "avatarUrl", friend.getAvatarUrl() != null ? friend.getAvatarUrl() : "",
                            "online", friend.isOnline()
                    );
                })
                .toList();
        return ResponseEntity.ok(friends);
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingRequests(@AuthenticationPrincipal UserEntity me) {
        List<Map<String, Object>> pending = friendshipRepository.findPendingRequests(me)
                .stream()
                .map(f -> Map.of(
                        "friendshipId", f.getId().toString(),
                        "from", Map.of(
                                "id", f.getRequester().getId().toString(),
                                "username", f.getRequester().getUsername(),
                                "avatarUrl", f.getRequester().getAvatarUrl() != null ? f.getRequester().getAvatarUrl() : ""
                        )
                ))
                .toList();
        return ResponseEntity.ok(pending);
    }

    @PostMapping("/request")
    public ResponseEntity<?> sendRequest(@AuthenticationPrincipal UserEntity me,
                                          @RequestBody Map<String, String> body) {
        String targetId = body.get("userId");
        if (targetId == null) return ResponseEntity.badRequest().body(Map.of("error", "userId required"));

        UserEntity target = userRepository.findById(UUID.fromString(targetId)).orElse(null);
        if (target == null) return ResponseEntity.notFound().build();
        if (target.getId().equals(me.getId())) return ResponseEntity.badRequest().body(Map.of("error", "Cannot friend yourself"));

        if (friendshipRepository.findBetween(me.getId(), target.getId()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Friendship already exists"));
        }

        FriendshipEntity friendship = FriendshipEntity.builder()
                .requester(me)
                .addressee(target)
                .build();
        friendshipRepository.save(friendship);
        return ResponseEntity.ok(Map.of("message", "Friend request sent"));
    }

    @PostMapping("/accept")
    public ResponseEntity<?> acceptRequest(@AuthenticationPrincipal UserEntity me,
                                            @RequestBody Map<String, String> body) {
        String friendshipId = body.get("friendshipId");
        if (friendshipId == null) return ResponseEntity.badRequest().body(Map.of("error", "friendshipId required"));

        FriendshipEntity friendship = friendshipRepository.findById(UUID.fromString(friendshipId)).orElse(null);
        if (friendship == null) return ResponseEntity.notFound().build();
        if (!friendship.getAddressee().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Not authorized"));
        }

        friendship.setStatus(FriendshipEntity.FriendshipStatus.ACCEPTED);
        friendshipRepository.save(friendship);
        return ResponseEntity.ok(Map.of("message", "Friend request accepted"));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<?> removeFriend(@AuthenticationPrincipal UserEntity me,
                                           @PathVariable String userId) {
        friendshipRepository.findBetween(me.getId(), UUID.fromString(userId))
                .ifPresent(friendshipRepository::delete);
        return ResponseEntity.ok(Map.of("message", "Friend removed"));
    }
}
