package com.ntyqb.backend.controller;

import com.ntyqb.backend.dto.AuthDtos;
import com.ntyqb.backend.entity.User;
import com.ntyqb.backend.service.AuthService;
import com.ntyqb.backend.service.MatchService;
import com.ntyqb.backend.service.StatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MeController {

    private final AuthService authService;
    private final StatsService statsService;
    private final MatchService matchService;

    public MeController(AuthService authService, StatsService statsService, MatchService matchService) {
        this.authService = authService;
        this.statsService = statsService;
        this.matchService = matchService;
    }

    @GetMapping("/me")
    public AuthDtos.MeResponse me() {
        User user = authService.requireCurrentUser();
        return new AuthDtos.MeResponse(
                authService.toUserSummary(user),
                statsService.getStatsForUser(user.getId()),
                matchService.getPendingConfirmations(user.getId(), 5),
                matchService.getRecentMatches(user.getId(), 5)
        );
    }
}
