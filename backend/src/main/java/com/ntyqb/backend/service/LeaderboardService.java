package com.ntyqb.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ntyqb.backend.dto.LeaderboardDtos;
import com.ntyqb.backend.entity.MatchParticipant;
import com.ntyqb.backend.entity.MatchRecord;
import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.entity.TeamSide;
import com.ntyqb.backend.entity.User;
import com.ntyqb.backend.repository.MatchRecordRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class LeaderboardService {

    private final MatchRecordRepository matchRecordRepository;
    private final ObjectMapper objectMapper;
    private final UserTagService userTagService;

    public LeaderboardService(
            MatchRecordRepository matchRecordRepository,
            ObjectMapper objectMapper,
            UserTagService userTagService
    ) {
        this.matchRecordRepository = matchRecordRepository;
        this.objectMapper = objectMapper;
        this.userTagService = userTagService;
    }

    public LeaderboardDtos.LeaderboardResponse getLeaderboard(SportType sportType) {
        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime nextMonthStart = monthStart.plusMonths(1);
        Comparator<MonthlyLeaderboardStat> leaderboardOrder = Comparator
                .comparingInt(MonthlyLeaderboardStat::rankingPoints).reversed()
                .thenComparing(Comparator.comparingDouble(MonthlyLeaderboardStat::winRate).reversed())
                .thenComparing(Comparator.comparingInt(MonthlyLeaderboardStat::netValue).reversed())
                .thenComparing(Comparator.comparingInt(MonthlyLeaderboardStat::recentTenWins).reversed())
                .thenComparing(
                        Comparator.comparing(
                                MonthlyLeaderboardStat::lastConfirmedAt,
                                Comparator.nullsLast(LocalDateTime::compareTo)
                        ).reversed()
                )
                .thenComparing(item -> item.user().getId());
        List<MonthlyLeaderboardStat> all = aggregateMonthlyStats(
                matchRecordRepository.findConfirmedBySportTypeWithinOccurredAt(sportType, monthStart, nextMonthStart)
        ).stream()
                .sorted(leaderboardOrder)
                .toList();

        AtomicInteger rank = new AtomicInteger(1);
        List<LeaderboardDtos.LeaderboardItemDto> ranked = all.stream()
                .filter(item -> item.matches() >= 3)
                .map(item -> toItem(item, rank.getAndIncrement(), true))
                .toList();
        List<LeaderboardDtos.LeaderboardItemDto> provisional = all.stream()
                .filter(item -> item.matches() < 3)
                .map(item -> toItem(item, 0, false))
                .toList();
        return new LeaderboardDtos.LeaderboardResponse(sportType, ranked, provisional);
    }

    private List<MonthlyLeaderboardStat> aggregateMonthlyStats(List<MatchRecord> matches) {
        Map<Long, MutableMonthlyLeaderboardStat> statsByUserId = new HashMap<>();
        for (MatchRecord match : matches) {
            for (MatchParticipant participant : match.getParticipants()) {
                User user = participant.getUser();
                MutableMonthlyLeaderboardStat stats = statsByUserId.computeIfAbsent(
                        user.getId(),
                        ignored -> new MutableMonthlyLeaderboardStat(user)
                );
                boolean isWin = participant.getSide() == match.getWinnerSide();
                stats.record(isWin, computeNetValue(match, participant.getSide()), match.getConfirmedAt());
            }
        }
        return statsByUserId.values().stream()
                .map(MutableMonthlyLeaderboardStat::freeze)
                .toList();
    }

    private LeaderboardDtos.LeaderboardItemDto toItem(MonthlyLeaderboardStat item, int rank, boolean eligible) {
        return new LeaderboardDtos.LeaderboardItemDto(
                item.user().getId(),
                item.user().getNickname(),
                item.user().getAvatarUrl(),
                userTagService.getTag(item.user().getId()),
                rank,
                eligible,
                item.matches(),
                item.wins(),
                item.losses(),
                item.winRate(),
                item.rankingPoints(),
                item.netValue(),
                item.streak()
        );
    }

    private int computeNetValue(MatchRecord match, TeamSide userSide) {
        JsonNode detail = readDetail(match.getDetailJson());
        int diff;
        if (match.getSportType() == SportType.BILLIARDS) {
            diff = detail.path("winMarginBalls").asInt(0);
        } else {
            int aWins = 0;
            int bWins = 0;
            for (JsonNode setNode : detail.path("sets")) {
                if (setNode.path("aScore").asInt() > setNode.path("bScore").asInt()) {
                    aWins++;
                } else {
                    bWins++;
                }
            }
            diff = Math.abs(aWins - bWins);
        }
        return userSide == match.getWinnerSide() ? diff : -diff;
    }

    private JsonNode readDetail(String detailJson) {
        try {
            return objectMapper.readTree(detailJson);
        } catch (Exception exception) {
            throw new IllegalStateException("detailJson 解析失败", exception);
        }
    }

    private record MatchOutcome(boolean win) {
    }

    private record MonthlyLeaderboardStat(
            User user,
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

    private static final class MutableMonthlyLeaderboardStat {

        private final User user;
        private final java.util.ArrayList<MatchOutcome> outcomes = new java.util.ArrayList<>();
        private int wins;
        private int netValue;
        private LocalDateTime lastConfirmedAt;

        private MutableMonthlyLeaderboardStat(User user) {
            this.user = user;
        }

        private void record(boolean win, int matchNetValue, LocalDateTime confirmedAt) {
            outcomes.add(new MatchOutcome(win));
            if (win) {
                wins++;
            }
            netValue += matchNetValue;
            if (lastConfirmedAt == null || (confirmedAt != null && confirmedAt.isAfter(lastConfirmedAt))) {
                lastConfirmedAt = confirmedAt;
            }
        }

        private MonthlyLeaderboardStat freeze() {
            int matches = outcomes.size();
            int recentTenWins = 0;
            int streak = 0;
            boolean streakOpen = true;
            for (int index = 0; index < outcomes.size(); index++) {
                MatchOutcome outcome = outcomes.get(index);
                if (index < 10 && outcome.win()) {
                    recentTenWins++;
                }
                if (streakOpen && outcome.win()) {
                    streak++;
                } else {
                    streakOpen = false;
                }
            }
            return new MonthlyLeaderboardStat(
                    user,
                    matches,
                    wins,
                    matches - wins,
                    matches == 0 ? 0D : Math.round((wins * 1000D) / matches) / 10D,
                    wins * 3,
                    netValue,
                    streak,
                    recentTenWins,
                    lastConfirmedAt
            );
        }
    }
}
