package com.ntyqb.backend.dto;

import com.ntyqb.backend.entity.MatchStatus;
import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.entity.UserStatus;

import java.time.LocalDateTime;
import java.util.List;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            String code,
            String nickname,
            String avatarUrl,
            String mockUserKey
    ) {
    }

    public record UserSummaryDto(
            Long id,
            String nickname,
            String avatarUrl,
            UserStatus status,
            String tag
    ) {
    }

    public record SportStatDto(
            SportType sportType,
            int matches,
            int wins,
            int losses,
            double winRate,
            int rankingPoints,
            int netValue,
            int streak,
            int recentTenWins,
            LocalDateTime lastConfirmedAt
    ) {
    }

    public record HomeMatchSnippetDto(
            Long id,
            SportType sportType,
            MatchStatus status,
            String title,
            String subtitle,
            LocalDateTime occurredAt
    ) {
    }

    public record LoginResponse(
            String token,
            String authMode,
            UserSummaryDto user
    ) {
    }

    public record MeResponse(
            UserSummaryDto user,
            List<SportStatDto> stats,
            List<HomeMatchSnippetDto> pendingConfirmations,
            List<HomeMatchSnippetDto> recentMatches
    ) {
    }

    public record SimpleMessageResponse(String message) {
    }
}
