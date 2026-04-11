package com.ntyqb.backend.controller;

import com.ntyqb.backend.config.AuthContext;
import com.ntyqb.backend.dto.MatchDtos;
import com.ntyqb.backend.entity.MatchStatus;
import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.entity.User;
import com.ntyqb.backend.exception.UnauthorizedException;
import com.ntyqb.backend.service.AuthService;
import com.ntyqb.backend.service.MatchService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final MatchService matchService;
    private final AuthService authService;

    public MatchController(MatchService matchService, AuthService authService) {
        this.matchService = matchService;
        this.authService = authService;
    }

    @PostMapping
    public MatchDtos.MatchDetailDto create(@Valid @RequestBody MatchDtos.CreateMatchRequest request) {
        User user = authService.requireCurrentUser();
        return matchService.createMatch(request, user);
    }

    @GetMapping
    public MatchDtos.MatchListResponse list(
            @RequestParam(defaultValue = "mine") String scope,
            @RequestParam(required = false) SportType sportType,
            @RequestParam(required = false) MatchStatus status
    ) {
        AuthContext.AuthInfo authInfo = AuthContext.get();
        Long currentUserId = authInfo == null ? null : authInfo.userId();
        if (currentUserId == null) {
            if (!"all".equals(scope)) {
                throw new UnauthorizedException("请先登录");
            }
            MatchStatus visibleStatus = status == null ? MatchStatus.CONFIRMED : status;
            if (visibleStatus != MatchStatus.CONFIRMED) {
                throw new UnauthorizedException("请先登录");
            }
            return matchService.listMatches(null, scope, sportType, visibleStatus);
        }
        return matchService.listMatches(currentUserId, scope, sportType, status);
    }

    @GetMapping("/{matchId}")
    public MatchDtos.MatchDetailDto detail(@PathVariable Long matchId) {
        User user = authService.requireCurrentUser();
        return matchService.getMatch(matchId, user.getId());
    }

    @PostMapping("/{matchId}/confirm")
    public MatchDtos.MatchDetailDto confirm(@PathVariable Long matchId) {
        User user = authService.requireCurrentUser();
        return matchService.confirm(matchId, user);
    }

    @PostMapping("/{matchId}/reject")
    public MatchDtos.MatchDetailDto reject(@PathVariable Long matchId) {
        User user = authService.requireCurrentUser();
        return matchService.reject(matchId, user);
    }

    @PostMapping("/{matchId}/cancel")
    public MatchDtos.MatchDetailDto cancel(@PathVariable Long matchId) {
        User user = authService.requireCurrentUser();
        return matchService.cancel(matchId, user);
    }
}
