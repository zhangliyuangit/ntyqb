package com.ntyqb.backend.controller;

import com.ntyqb.backend.dto.LeaderboardDtos;
import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.service.AuthService;
import com.ntyqb.backend.service.LeaderboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leaderboards")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;
    private final AuthService authService;

    public LeaderboardController(LeaderboardService leaderboardService, AuthService authService) {
        this.leaderboardService = leaderboardService;
        this.authService = authService;
    }

    @GetMapping
    public LeaderboardDtos.LeaderboardResponse getLeaderboard(@RequestParam SportType sportType) {
        authService.requireCurrentUser();
        return leaderboardService.getLeaderboard(sportType);
    }
}
