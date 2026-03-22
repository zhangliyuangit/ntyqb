package com.ntyqb.backend.dto;

import com.ntyqb.backend.entity.SportType;

import java.util.List;

public final class LeaderboardDtos {

    private LeaderboardDtos() {
    }

    public record LeaderboardItemDto(
            Long userId,
            String nickname,
            String avatarUrl,
            int rank,
            boolean eligible,
            int matches,
            int wins,
            int losses,
            double winRate,
            int rankingPoints,
            int netValue,
            int streak
    ) {
    }

    public record LeaderboardResponse(
            SportType sportType,
            List<LeaderboardItemDto> ranked,
            List<LeaderboardItemDto> provisional
    ) {
    }
}
