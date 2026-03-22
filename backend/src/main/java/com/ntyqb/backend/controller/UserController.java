package com.ntyqb.backend.controller;

import com.ntyqb.backend.dto.AuthDtos;
import com.ntyqb.backend.dto.MatchDtos;
import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.entity.User;
import com.ntyqb.backend.service.AuthService;
import com.ntyqb.backend.service.UserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final AuthService authService;
    private final UserService userService;

    public UserController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    @GetMapping("/search")
    public List<AuthDtos.UserSummaryDto> search(@RequestParam(defaultValue = "") String keyword) {
        User user = authService.requireCurrentUser();
        return userService.searchUsers(keyword, user.getId());
    }

    @GetMapping("/recent-opponents")
    public List<MatchDtos.RecentPlayerDto> recentOpponents(@RequestParam SportType sportType) {
        User user = authService.requireCurrentUser();
        return userService.recentOpponents(user.getId(), sportType);
    }

    @GetMapping("/{userId}/profile")
    public MatchDtos.PlayerProfileResponse playerProfile(
            @PathVariable Long userId,
            @RequestParam SportType sportType
    ) {
        User currentUser = authService.requireCurrentUser();
        return userService.getPlayerProfile(userId, sportType, currentUser.getId());
    }
}
