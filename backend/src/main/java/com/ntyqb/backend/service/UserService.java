package com.ntyqb.backend.service;

import com.ntyqb.backend.dto.AuthDtos;
import com.ntyqb.backend.dto.MatchDtos;
import com.ntyqb.backend.entity.MatchParticipant;
import com.ntyqb.backend.entity.MatchRecord;
import com.ntyqb.backend.entity.MatchStatus;
import com.ntyqb.backend.entity.ParticipantRole;
import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.entity.TeamSide;
import com.ntyqb.backend.entity.User;
import com.ntyqb.backend.exception.NotFoundException;
import com.ntyqb.backend.repository.MatchRecordRepository;
import com.ntyqb.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final MatchRecordRepository matchRecordRepository;
    private final AuthService authService;
    private final StatsService statsService;
    private final MatchService matchService;

    public UserService(
            UserRepository userRepository,
            MatchRecordRepository matchRecordRepository,
            AuthService authService,
            StatsService statsService,
            MatchService matchService
    ) {
        this.userRepository = userRepository;
        this.matchRecordRepository = matchRecordRepository;
        this.authService = authService;
        this.statsService = statsService;
        this.matchService = matchService;
    }

    public List<AuthDtos.UserSummaryDto> searchUsers(String keyword, Long currentUserId) {
        String searchText = keyword == null ? "" : keyword.trim();
        return userRepository.searchByKeyword(searchText).stream()
                .filter(user -> !user.getId().equals(currentUserId))
                .map(authService::toUserSummary)
                .toList();
    }

    public List<MatchDtos.RecentPlayerDto> recentOpponents(Long currentUserId, SportType sportType) {
        Map<Long, RecentPlayerAccumulator> users = new LinkedHashMap<>();
        List<MatchRecord> matches = matchRecordRepository.findConfirmedByUserIdAndSportType(currentUserId, sportType);
        for (MatchRecord match : matches) {
            TeamSide mySide = match.getParticipants().stream()
                    .filter(item -> item.getUser().getId().equals(currentUserId))
                    .findFirst()
                    .map(MatchParticipant::getSide)
                    .orElse(null);
            if (mySide == null) {
                continue;
            }
            for (MatchParticipant participant : match.getParticipants()) {
                if (participant.getUser().getId().equals(currentUserId)) {
                    continue;
                }
                RecentPlayerAccumulator accumulator = users.computeIfAbsent(
                        participant.getUser().getId(),
                        ignored -> new RecentPlayerAccumulator(participant.getUser())
                );
                if (participant.getSide() == mySide) {
                    accumulator.teammateCount++;
                } else {
                    accumulator.opponentCount++;
                }
                if (accumulator.lastPlayedAt == null || match.getConfirmedAt().isAfter(accumulator.lastPlayedAt)) {
                    accumulator.lastPlayedAt = match.getConfirmedAt();
                }
            }
        }
        return users.values().stream()
                .sorted(Comparator.comparing(RecentPlayerAccumulator::lastPlayedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(12)
                .map(accumulator -> new MatchDtos.RecentPlayerDto(
                        accumulator.user.getId(),
                        accumulator.user.getNickname(),
                        accumulator.user.getAvatarUrl(),
                        accumulator.lastPlayedAt,
                        accumulator.opponentCount,
                        accumulator.teammateCount
                ))
                .toList();
    }

    public MatchDtos.PlayerProfileResponse getPlayerProfile(Long playerId, SportType sportType, Long currentUserId) {
        User user = userRepository.findById(playerId).orElseThrow(() -> new NotFoundException("用户不存在"));
        return new MatchDtos.PlayerProfileResponse(
                authService.toUserSummary(user),
                statsService.getStatForUser(playerId, sportType),
                matchService.getPlayerRecentMatches(playerId, sportType, 10, currentUserId)
        );
    }

    private static class RecentPlayerAccumulator {
        private final User user;
        private LocalDateTime lastPlayedAt;
        private int opponentCount;
        private int teammateCount;

        private RecentPlayerAccumulator(User user) {
            this.user = user;
        }

        private LocalDateTime lastPlayedAt() {
            return lastPlayedAt;
        }
    }
}
