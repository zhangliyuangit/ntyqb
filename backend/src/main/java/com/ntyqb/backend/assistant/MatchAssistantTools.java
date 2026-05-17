package com.ntyqb.backend.assistant;

import com.ntyqb.backend.dto.AuthDtos;
import com.ntyqb.backend.dto.MatchDtos;
import com.ntyqb.backend.entity.MatchStatus;
import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.service.MatchService;
import com.ntyqb.backend.service.UserService;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class MatchAssistantTools {

    private final MatchService matchService;
    private final UserService userService;

    public MatchAssistantTools(MatchService matchService, UserService userService) {
        this.matchService = matchService;
        this.userService = userService;
    }

    public List<AuthDtos.UserSummaryDto> searchUsers(String keyword, Long currentUserId) {
        return userService.searchUsers(keyword == null ? "" : keyword, currentUserId);
    }

    public List<AssistantDtos.ResultDto> listMyMatches(
            Long currentUserId,
            String scope,
            SportType sportType,
            MatchStatus status,
            int limit
    ) {
        int clampedLimit = Math.max(1, Math.min(8, limit));
        return matchService.listMatches(currentUserId, scope, sportType, status).items().stream()
                .limit(clampedLimit)
                .map(this::toResult)
                .toList();
    }

    public List<AssistantDtos.ResultDto> listPendingConfirmations(Long currentUserId, int limit) {
        return listMyMatches(currentUserId, "pending_confirmation", null, MatchStatus.PENDING, limit);
    }

    private AssistantDtos.ResultDto toResult(MatchDtos.MatchDetailDto match) {
        String title = match.sportType() + " · " + match.status();
        String subtitle = match.participants().stream()
                .map(MatchDtos.MatchParticipantDto::nickname)
                .collect(Collectors.joining(" / "));
        return new AssistantDtos.ResultDto("MATCH", title, subtitle, match.id());
    }
}
