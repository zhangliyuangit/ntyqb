package com.ntyqb.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ntyqb.backend.dto.AuthDtos;
import com.ntyqb.backend.entity.MatchParticipant;
import com.ntyqb.backend.entity.MatchRecord;
import com.ntyqb.backend.entity.SportStats;
import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.entity.TeamSide;
import com.ntyqb.backend.entity.User;
import com.ntyqb.backend.repository.MatchRecordRepository;
import com.ntyqb.backend.repository.SportStatsRepository;
import com.ntyqb.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class StatsService {

    private final MatchRecordRepository matchRecordRepository;
    private final SportStatsRepository sportStatsRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public StatsService(
            MatchRecordRepository matchRecordRepository,
            SportStatsRepository sportStatsRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper
    ) {
        this.matchRecordRepository = matchRecordRepository;
        this.sportStatsRepository = sportStatsRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void refreshSportStats(SportType sportType, Set<Long> userIds) {
        for (Long userId : userIds) {
            User user = userRepository.findById(userId).orElseThrow();
            List<MatchRecord> matches = matchRecordRepository.findConfirmedByUserIdAndSportType(userId, sportType);
            SportStats stats = sportStatsRepository.findByUserIdAndSportType(userId, sportType)
                    .orElseGet(() -> {
                        SportStats value = new SportStats();
                        value.setUser(user);
                        value.setSportType(sportType);
                        return value;
                    });

            int wins = 0;
            int netValue = 0;
            int recentTenWins = 0;
            int streak = 0;
            boolean streakOpen = true;

            for (int index = 0; index < matches.size(); index++) {
                MatchRecord match = matches.get(index);
                TeamSide userSide = findUserSide(match, userId);
                boolean isWin = userSide == match.getWinnerSide();
                if (isWin) {
                    wins++;
                }
                netValue += computeNetValue(match, userSide);
                if (index < 10 && isWin) {
                    recentTenWins++;
                }
                if (streakOpen && isWin) {
                    streak++;
                } else {
                    streakOpen = false;
                }
            }

            int total = matches.size();
            stats.setMatches(total);
            stats.setWins(wins);
            stats.setLosses(total - wins);
            stats.setWinRate(total == 0 ? 0D : Math.round((wins * 1000D) / total) / 10D);
            stats.setRankingPoints(wins * 3);
            stats.setNetValue(netValue);
            stats.setRecentTenWins(recentTenWins);
            stats.setStreak(streak);
            stats.setLastConfirmedAt(matches.isEmpty() ? null : matches.get(0).getConfirmedAt());

            sportStatsRepository.save(stats);
        }
    }

    @Transactional
    public void refreshAllStats() {
        List<User> users = userRepository.findAll();
        for (SportType sportType : SportType.values()) {
            refreshSportStats(sportType, users.stream().map(User::getId).collect(java.util.stream.Collectors.toSet()));
        }
    }

    public List<AuthDtos.SportStatDto> getStatsForUser(Long userId) {
        Map<SportType, AuthDtos.SportStatDto> results = new EnumMap<>(SportType.class);
        for (SportType sportType : SportType.values()) {
            SportStats stats = sportStatsRepository.findByUserIdAndSportType(userId, sportType).orElse(null);
            results.put(sportType, toDto(sportType, stats));
        }
        return new ArrayList<>(results.values());
    }

    public AuthDtos.SportStatDto getStatForUser(Long userId, SportType sportType) {
        return toDto(sportType, sportStatsRepository.findByUserIdAndSportType(userId, sportType).orElse(null));
    }

    public List<SportStats> getStatsBySport(SportType sportType) {
        return sportStatsRepository.findBySportType(sportType);
    }

    private AuthDtos.SportStatDto toDto(SportType sportType, SportStats stats) {
        if (stats == null) {
            return new AuthDtos.SportStatDto(sportType, 0, 0, 0, 0D, 0, 0, 0, 0, null);
        }
        return new AuthDtos.SportStatDto(
                sportType,
                stats.getMatches(),
                stats.getWins(),
                stats.getLosses(),
                stats.getWinRate(),
                stats.getRankingPoints(),
                stats.getNetValue(),
                stats.getStreak(),
                stats.getRecentTenWins(),
                stats.getLastConfirmedAt()
        );
    }

    private TeamSide findUserSide(MatchRecord match, Long userId) {
        return match.getParticipants().stream()
                .filter(participant -> participant.getUser().getId().equals(userId))
                .findFirst()
                .map(MatchParticipant::getSide)
                .orElseThrow();
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
}
