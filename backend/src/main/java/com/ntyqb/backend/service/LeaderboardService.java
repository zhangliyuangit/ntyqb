package com.ntyqb.backend.service;

import com.ntyqb.backend.dto.LeaderboardDtos;
import com.ntyqb.backend.entity.SportStats;
import com.ntyqb.backend.entity.SportType;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class LeaderboardService {

    private final StatsService statsService;

    public LeaderboardService(StatsService statsService) {
        this.statsService = statsService;
    }

    public LeaderboardDtos.LeaderboardResponse getLeaderboard(SportType sportType) {
        List<SportStats> all = statsService.getStatsBySport(sportType).stream()
                .filter(stats -> stats.getMatches() > 0)
                .sorted(Comparator
                        .comparingInt(SportStats::getRankingPoints).reversed()
                        .thenComparingDouble(SportStats::getWinRate).reversed()
                        .thenComparingInt(SportStats::getNetValue).reversed()
                        .thenComparingInt(SportStats::getRecentTenWins).reversed()
                        .thenComparing(SportStats::getLastConfirmedAt, Comparator.nullsLast(LocalDateTime::compareTo)).reversed()
                        .thenComparing(item -> item.getUser().getId()))
                .toList();

        AtomicInteger rank = new AtomicInteger(1);
        List<LeaderboardDtos.LeaderboardItemDto> ranked = all.stream()
                .filter(item -> item.getMatches() >= 3)
                .map(item -> toItem(item, rank.getAndIncrement(), true))
                .toList();
        List<LeaderboardDtos.LeaderboardItemDto> provisional = all.stream()
                .filter(item -> item.getMatches() < 3)
                .map(item -> toItem(item, 0, false))
                .toList();
        return new LeaderboardDtos.LeaderboardResponse(sportType, ranked, provisional);
    }

    private LeaderboardDtos.LeaderboardItemDto toItem(SportStats item, int rank, boolean eligible) {
        return new LeaderboardDtos.LeaderboardItemDto(
                item.getUser().getId(),
                item.getUser().getNickname(),
                item.getUser().getAvatarUrl(),
                rank,
                eligible,
                item.getMatches(),
                item.getWins(),
                item.getLosses(),
                item.getWinRate(),
                item.getRankingPoints(),
                item.getNetValue(),
                item.getStreak()
        );
    }
}
