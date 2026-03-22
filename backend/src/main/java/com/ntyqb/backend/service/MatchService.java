package com.ntyqb.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ntyqb.backend.dto.AuthDtos;
import com.ntyqb.backend.dto.MatchDtos;
import com.ntyqb.backend.entity.MatchFormat;
import com.ntyqb.backend.entity.MatchParticipant;
import com.ntyqb.backend.entity.MatchRecord;
import com.ntyqb.backend.entity.MatchStatus;
import com.ntyqb.backend.entity.ParticipantConfirmState;
import com.ntyqb.backend.entity.ParticipantRole;
import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.entity.TeamSide;
import com.ntyqb.backend.entity.User;
import com.ntyqb.backend.exception.BadRequestException;
import com.ntyqb.backend.exception.NotFoundException;
import com.ntyqb.backend.repository.MatchRecordRepository;
import com.ntyqb.backend.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class MatchService {

    private final MatchRecordRepository matchRecordRepository;
    private final UserRepository userRepository;
    private final StatsService statsService;
    private final ObjectMapper objectMapper;
    private final UserTagService userTagService;

    public MatchService(
            MatchRecordRepository matchRecordRepository,
            UserRepository userRepository,
            StatsService statsService,
            ObjectMapper objectMapper,
            UserTagService userTagService
    ) {
        this.matchRecordRepository = matchRecordRepository;
        this.userRepository = userRepository;
        this.statsService = statsService;
        this.objectMapper = objectMapper;
        this.userTagService = userTagService;
    }

    @Transactional
    public MatchDtos.MatchDetailDto createMatch(@Valid MatchDtos.CreateMatchRequest request, User initiator) {
        validateRequest(request, initiator);

        MatchRecord record = new MatchRecord();
        record.setSportType(request.sportType());
        record.setFormat(request.format());
        record.setStatus(MatchStatus.PENDING);
        record.setInitiator(initiator);
        record.setOccurredAt(request.occurredAt() == null ? LocalDateTime.now() : request.occurredAt());
        record.setWinnerSide(request.winnerSide());
        record.setExpiresAt(LocalDateTime.now().plusDays(7));
        record.setDetailJson(buildDetailJson(request));

        Map<Long, User> userMap = loadUsers(request.participantIdsA(), request.participantIdsB());
        addParticipant(record, userMap.get(initiator.getId()), TeamSide.A, ParticipantRole.INITIATOR, ParticipantConfirmState.APPROVED);
        for (Long userId : request.participantIdsA()) {
            if (userId.equals(initiator.getId())) {
                continue;
            }
            addParticipant(record, userMap.get(userId), TeamSide.A, ParticipantRole.TEAMMATE, ParticipantConfirmState.APPROVED);
        }
        for (Long userId : request.participantIdsB()) {
            addParticipant(record, userMap.get(userId), TeamSide.B, ParticipantRole.OPPONENT, ParticipantConfirmState.PENDING);
        }

        MatchRecord saved = matchRecordRepository.save(record);
        MatchRecord detailed = matchRecordRepository.findDetailedById(saved.getId()).orElseThrow();
        return toDto(detailed, initiator.getId());
    }

    public MatchDtos.MatchListResponse listMatches(Long currentUserId, String scope, SportType sportType, MatchStatus status) {
        expirePendingMatchesIfNeeded();
        List<MatchRecord> matches = "all".equals(scope)
                ? matchRecordRepository.findAllVisible(sportType, status)
                : matchRecordRepository.findAllByUserId(currentUserId, sportType, status);
        List<MatchDtos.MatchDetailDto> items = matches.stream()
                .filter(match -> "all".equals(scope) || matchesScope(match, currentUserId, scope))
                .map(match -> toDto(match, currentUserId))
                .toList();
        return new MatchDtos.MatchListResponse(items);
    }

    public MatchDtos.MatchDetailDto getMatch(Long matchId, Long currentUserId) {
        expirePendingMatchesIfNeeded();
        MatchRecord match = requireMatch(matchId);
        ensureParticipant(match, currentUserId);
        return toDto(match, currentUserId);
    }

    @Transactional
    public MatchDtos.MatchDetailDto confirm(Long matchId, User currentUser) {
        expirePendingMatchesIfNeeded();
        MatchRecord match = requirePendingMatch(matchId);
        MatchParticipant participant = match.getParticipants().stream()
                .filter(item -> item.getUser().getId().equals(currentUser.getId()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("只有参赛者才能确认"));
        if (participant.getRole() != ParticipantRole.OPPONENT) {
            throw new BadRequestException("当前记录不需要你确认");
        }
        if (participant.getConfirmState() != ParticipantConfirmState.PENDING) {
            throw new BadRequestException("当前确认状态不可重复操作");
        }

        participant.setConfirmState(ParticipantConfirmState.APPROVED);
        match.getParticipants().stream()
                .filter(item -> item.getConfirmState() == ParticipantConfirmState.PENDING)
                .forEach(item -> item.setConfirmState(ParticipantConfirmState.NOT_REQUIRED));
        match.setStatus(MatchStatus.CONFIRMED);
        match.setConfirmedAt(LocalDateTime.now());
        MatchRecord saved = matchRecordRepository.save(match);
        refreshStats(saved);
        return toDto(saved, currentUser.getId());
    }

    @Transactional
    public MatchDtos.MatchDetailDto reject(Long matchId, User currentUser) {
        expirePendingMatchesIfNeeded();
        MatchRecord match = requirePendingMatch(matchId);
        MatchParticipant participant = match.getParticipants().stream()
                .filter(item -> item.getUser().getId().equals(currentUser.getId()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("只有参赛者才能拒绝"));
        if (participant.getRole() != ParticipantRole.OPPONENT) {
            throw new BadRequestException("当前记录不需要你拒绝");
        }
        if (participant.getConfirmState() != ParticipantConfirmState.PENDING) {
            throw new BadRequestException("当前拒绝状态不可重复操作");
        }

        participant.setConfirmState(ParticipantConfirmState.REJECTED);
        match.getParticipants().stream()
                .filter(item -> item.getConfirmState() == ParticipantConfirmState.PENDING)
                .forEach(item -> item.setConfirmState(ParticipantConfirmState.NOT_REQUIRED));
        match.setStatus(MatchStatus.REJECTED);
        MatchRecord saved = matchRecordRepository.save(match);
        return toDto(saved, currentUser.getId());
    }

    @Transactional
    public MatchDtos.MatchDetailDto cancel(Long matchId, User currentUser) {
        expirePendingMatchesIfNeeded();
        MatchRecord match = requirePendingMatch(matchId);
        if (!match.getInitiator().getId().equals(currentUser.getId())) {
            throw new BadRequestException("只有发起人可以取消记录");
        }
        match.setStatus(MatchStatus.CANCELLED);
        match.getParticipants().stream()
                .filter(item -> item.getConfirmState() == ParticipantConfirmState.PENDING)
                .forEach(item -> item.setConfirmState(ParticipantConfirmState.NOT_REQUIRED));
        MatchRecord saved = matchRecordRepository.save(match);
        return toDto(saved, currentUser.getId());
    }

    public List<AuthDtos.HomeMatchSnippetDto> getPendingConfirmations(Long currentUserId, int limit) {
        return matchRecordRepository.findAllByUserId(currentUserId, null, MatchStatus.PENDING).stream()
                .filter(match -> match.getParticipants().stream()
                        .anyMatch(participant -> participant.getUser().getId().equals(currentUserId)
                                && participant.getRole() == ParticipantRole.OPPONENT
                                && participant.getConfirmState() == ParticipantConfirmState.PENDING))
                .limit(limit)
                .map(this::toSnippet)
                .toList();
    }

    public List<AuthDtos.HomeMatchSnippetDto> getRecentMatches(Long currentUserId, int limit) {
        expirePendingMatchesIfNeeded();
        return matchRecordRepository.findAllByUserId(currentUserId, null, null).stream()
                .limit(limit)
                .map(this::toSnippet)
                .toList();
    }

    public List<MatchDtos.MatchDetailDto> getPlayerRecentMatches(Long playerId, SportType sportType, int limit, Long currentUserId) {
        return matchRecordRepository.findAllByUserId(playerId, sportType, MatchStatus.CONFIRMED).stream()
                .limit(limit)
                .map(match -> toDto(match, currentUserId))
                .toList();
    }

    @Transactional
    public void expirePendingMatchesIfNeeded() {
        List<MatchRecord> expired = matchRecordRepository.findByStatusAndExpiresAtBefore(MatchStatus.PENDING, LocalDateTime.now());
        if (expired.isEmpty()) {
            return;
        }
        expired.forEach(match -> {
            match.setStatus(MatchStatus.EXPIRED);
            match.getParticipants().stream()
                    .filter(participant -> participant.getConfirmState() == ParticipantConfirmState.PENDING)
                    .forEach(participant -> participant.setConfirmState(ParticipantConfirmState.NOT_REQUIRED));
        });
        matchRecordRepository.saveAll(expired);
    }

    public MatchDtos.MatchDetailDto toDto(MatchRecord match, Long currentUserId) {
        JsonNode detail = readDetail(match.getDetailJson());
        MatchParticipant self = match.getParticipants().stream()
                .filter(item -> item.getUser().getId().equals(currentUserId))
                .findFirst()
                .orElse(null);
        boolean canConfirm = self != null
                && match.getStatus() == MatchStatus.PENDING
                && self.getRole() == ParticipantRole.OPPONENT
                && self.getConfirmState() == ParticipantConfirmState.PENDING;
        boolean canReject = canConfirm;
        boolean canCancel = match.getStatus() == MatchStatus.PENDING && match.getInitiator().getId().equals(currentUserId);

        List<MatchDtos.MatchParticipantDto> participants = match.getParticipants().stream()
                .sorted(Comparator.comparing(MatchParticipant::getSide).thenComparing(item -> item.getUser().getId()))
                .map(item -> new MatchDtos.MatchParticipantDto(
                        item.getUser().getId(),
                        item.getUser().getNickname(),
                        item.getUser().getAvatarUrl(),
                        userTagService.getTag(item.getUser().getId()),
                        item.getSide(),
                        item.getRole(),
                        item.getConfirmState()
                ))
                .toList();

        return new MatchDtos.MatchDetailDto(
                match.getId(),
                match.getSportType(),
                match.getFormat(),
                match.getStatus(),
                match.getOccurredAt(),
                match.getConfirmedAt(),
                match.getExpiresAt(),
                match.getWinnerSide(),
                match.getInitiator().getId(),
                match.getInitiator().getNickname(),
                detail,
                participants,
                canConfirm,
                canReject,
                canCancel
        );
    }

    private MatchRecord requireMatch(Long matchId) {
        return matchRecordRepository.findDetailedById(matchId)
                .orElseThrow(() -> new NotFoundException("比赛记录不存在"));
    }

    private MatchRecord requirePendingMatch(Long matchId) {
        MatchRecord match = requireMatch(matchId);
        if (match.getStatus() != MatchStatus.PENDING) {
            throw new BadRequestException("当前记录状态不支持此操作");
        }
        return match;
    }

    private void ensureParticipant(MatchRecord match, Long currentUserId) {
        boolean joined = match.getParticipants().stream().anyMatch(item -> item.getUser().getId().equals(currentUserId));
        if (!joined) {
            throw new BadRequestException("无权查看该记录");
        }
    }

    private boolean matchesScope(MatchRecord match, Long currentUserId, String scope) {
        if (scope == null || scope.isBlank() || "mine".equals(scope)) {
            return true;
        }
        if ("initiated".equals(scope)) {
            return match.getInitiator().getId().equals(currentUserId);
        }
        if ("pending_confirmation".equals(scope)) {
            return match.getStatus() == MatchStatus.PENDING && match.getParticipants().stream()
                    .anyMatch(item -> item.getUser().getId().equals(currentUserId)
                            && item.getRole() == ParticipantRole.OPPONENT
                            && item.getConfirmState() == ParticipantConfirmState.PENDING);
        }
        return true;
    }

    private String buildDetailJson(MatchDtos.CreateMatchRequest request) {
        Map<String, Object> detail = new LinkedHashMap<>();
        if (request.sportType() == SportType.BILLIARDS) {
            detail.put("winMarginBalls", request.winMarginBalls());
            detail.put("remark", request.remark());
        } else if (request.sportType() == SportType.BADMINTON) {
            detail.put("isDoubles", request.format() == MatchFormat.DOUBLES);
            detail.put("sets", request.sets());
            detail.put("remark", request.remark());
        } else {
            detail.put("bestOf", request.bestOf());
            detail.put("sets", request.sets());
            detail.put("remark", request.remark());
        }
        try {
            return objectMapper.writeValueAsString(detail);
        } catch (Exception exception) {
            throw new IllegalStateException("比赛详情序列化失败", exception);
        }
    }

    private JsonNode readDetail(String detailJson) {
        try {
            return objectMapper.readTree(detailJson);
        } catch (Exception exception) {
            throw new IllegalStateException("比赛详情解析失败", exception);
        }
    }

    private void validateRequest(MatchDtos.CreateMatchRequest request, User initiator) {
        if (request.participantIdsA() == null || request.participantIdsA().isEmpty()
                || request.participantIdsB() == null || request.participantIdsB().isEmpty()) {
            throw new BadRequestException("双方参赛者不能为空");
        }
        if (!request.participantIdsA().contains(initiator.getId())) {
            throw new BadRequestException("发起人必须在我方");
        }

        List<Long> allIds = new ArrayList<>();
        allIds.addAll(request.participantIdsA());
        allIds.addAll(request.participantIdsB());
        if (new LinkedHashSet<>(allIds).size() != allIds.size()) {
            throw new BadRequestException("参赛者不能重复");
        }

        switch (request.sportType()) {
            case BILLIARDS -> validateBilliards(request);
            case BADMINTON -> validateBadminton(request);
            case TABLE_TENNIS -> validateTableTennis(request);
        }
    }

    private void validateBilliards(MatchDtos.CreateMatchRequest request) {
        if (request.format() != MatchFormat.SINGLES) {
            throw new BadRequestException("台球仅支持单打");
        }
        if (request.participantIdsA().size() != 1 || request.participantIdsB().size() != 1) {
            throw new BadRequestException("台球必须是 1v1");
        }
        if (request.winMarginBalls() == null || request.winMarginBalls() < 0) {
            throw new BadRequestException("台球必须填写净胜球数，可为 0");
        }
    }

    private void validateBadminton(MatchDtos.CreateMatchRequest request) {
        int expected = request.format() == MatchFormat.DOUBLES ? 2 : 1;
        if (request.participantIdsA().size() != expected || request.participantIdsB().size() != expected) {
            throw new BadRequestException("羽毛球人数与赛制不匹配");
        }
        List<MatchDtos.SetScoreDto> sets = request.sets();
        if (sets == null || sets.isEmpty() || sets.size() > 3) {
            throw new BadRequestException("羽毛球需要填写 1 到 3 局比分");
        }
        validateSets(sets, 21, 30);
        ensureWinnerMatchesSets(request.winnerSide(), sets);
    }

    private void validateTableTennis(MatchDtos.CreateMatchRequest request) {
        if (request.format() != MatchFormat.SINGLES) {
            throw new BadRequestException("乒乓球仅支持单打");
        }
        if (request.participantIdsA().size() != 1 || request.participantIdsB().size() != 1) {
            throw new BadRequestException("乒乓球必须是 1v1");
        }
        if (request.bestOf() == null || !Set.of(3, 5, 7).contains(request.bestOf())) {
            throw new BadRequestException("乒乓球 bestOf 仅支持 3、5、7");
        }
        List<MatchDtos.SetScoreDto> sets = request.sets();
        if (sets == null || sets.isEmpty() || sets.size() > request.bestOf()) {
            throw new BadRequestException("乒乓球局数不合法");
        }
        validateSets(sets, 11, 99);
        ensureWinnerMatchesSets(request.winnerSide(), sets);
        int winTarget = request.bestOf() / 2 + 1;
        int aWins = countSetWins(sets, TeamSide.A);
        int bWins = countSetWins(sets, TeamSide.B);
        if (Math.max(aWins, bWins) < winTarget) {
            throw new BadRequestException("乒乓球未达到决胜局数");
        }
    }

    private void validateSets(List<MatchDtos.SetScoreDto> sets, int normalTarget, int hardMax) {
        for (MatchDtos.SetScoreDto set : sets) {
            if (set == null || set.aScore() == null || set.bScore() == null) {
                throw new BadRequestException("比分不能为空");
            }
            if (set.aScore() < 0 || set.bScore() < 0 || set.aScore().equals(set.bScore())) {
                throw new BadRequestException("比分格式不合法");
            }
            int winner = Math.max(set.aScore(), set.bScore());
            int loser = Math.min(set.aScore(), set.bScore());
            if (winner < normalTarget) {
                throw new BadRequestException("获胜方得分未达到最小要求");
            }
            if (winner != hardMax && winner - loser < 2) {
                throw new BadRequestException("每局至少净胜 2 分");
            }
            if (winner > hardMax) {
                throw new BadRequestException("比分超出允许范围");
            }
        }
    }

    private void ensureWinnerMatchesSets(TeamSide winnerSide, List<MatchDtos.SetScoreDto> sets) {
        int aWins = countSetWins(sets, TeamSide.A);
        int bWins = countSetWins(sets, TeamSide.B);
        if (aWins == bWins) {
            throw new BadRequestException("比分不能打平");
        }
        TeamSide computed = aWins > bWins ? TeamSide.A : TeamSide.B;
        if (computed != winnerSide) {
            throw new BadRequestException("胜负方与比分结果不一致");
        }
    }

    private int countSetWins(List<MatchDtos.SetScoreDto> sets, TeamSide side) {
        return (int) sets.stream()
                .filter(set -> side == TeamSide.A ? set.aScore() > set.bScore() : set.bScore() > set.aScore())
                .count();
    }

    private Map<Long, User> loadUsers(List<Long> idsA, List<Long> idsB) {
        Set<Long> ids = new LinkedHashSet<>();
        ids.addAll(idsA);
        ids.addAll(idsB);
        Map<Long, User> userMap = userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, item -> item));
        if (userMap.size() != ids.size()) {
            throw new BadRequestException("存在未注册的球友，无法发起记录");
        }
        return userMap;
    }

    private void addParticipant(
            MatchRecord record,
            User user,
            TeamSide side,
            ParticipantRole role,
            ParticipantConfirmState confirmState
    ) {
        MatchParticipant participant = new MatchParticipant();
        participant.setUser(user);
        participant.setSide(side);
        participant.setRole(role);
        participant.setConfirmState(confirmState);
        record.addParticipant(participant);
    }

    private void refreshStats(MatchRecord record) {
        Set<Long> userIds = record.getParticipants().stream()
                .map(participant -> participant.getUser().getId())
                .collect(Collectors.toSet());
        statsService.refreshSportStats(record.getSportType(), userIds);
    }

    private AuthDtos.HomeMatchSnippetDto toSnippet(MatchRecord match) {
        String teamA = buildTeamText(match, TeamSide.A);
        String teamB = buildTeamText(match, TeamSide.B);
        String title = sportLabel(match.getSportType()) + " · " + formatLabel(match);
        String subtitle = teamA + " vs " + teamB;
        return new AuthDtos.HomeMatchSnippetDto(match.getId(), match.getSportType(), match.getStatus(), title, subtitle, match.getOccurredAt());
    }

    private String buildTeamText(MatchRecord match, TeamSide side) {
        return match.getParticipants().stream()
                .filter(item -> item.getSide() == side)
                .map(item -> item.getUser().getNickname())
                .collect(Collectors.joining("/"));
    }

    private String sportLabel(SportType sportType) {
        return switch (sportType) {
            case BILLIARDS -> "台球";
            case BADMINTON -> "羽毛球";
            case TABLE_TENNIS -> "乒乓球";
        };
    }

    private String formatLabel(MatchRecord record) {
        if (record.getSportType() == SportType.BADMINTON) {
            return record.getFormat() == MatchFormat.DOUBLES ? "双打" : "单打";
        }
        return "单打";
    }
}
