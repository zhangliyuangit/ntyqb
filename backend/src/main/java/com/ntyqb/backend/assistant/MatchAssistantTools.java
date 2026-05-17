package com.ntyqb.backend.assistant;

import com.ntyqb.backend.dto.AuthDtos;
import com.ntyqb.backend.dto.MatchDtos;
import com.ntyqb.backend.entity.MatchStatus;
import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.service.MatchService;
import com.ntyqb.backend.service.UserService;
import io.agentscope.core.tool.Tool;
import io.agentscope.core.tool.ToolParam;
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

    @Tool(name = "search_users", description = "搜索当前用户可选择的球友")
    public List<AuthDtos.UserSummaryDto> searchUsers(
            @ToolParam(name = "keyword", description = "球友昵称关键词") String keyword,
            AssistantUserContext context
    ) {
        return userService.searchUsers(keyword == null ? "" : keyword, context.userId());
    }

    @Tool(name = "list_my_matches", description = "查询当前用户的比赛记录")
    public List<AssistantDtos.ResultDto> listMyMatches(
            AssistantUserContext context,
            @ToolParam(name = "scope", description = "mine、pending_confirmation 或 initiated") String scope,
            @ToolParam(name = "sportType", description = "BILLIARDS、BADMINTON、TABLE_TENNIS，可为空") SportType sportType,
            @ToolParam(name = "status", description = "PENDING、CONFIRMED、REJECTED、CANCELLED、EXPIRED，可为空") MatchStatus status,
            @ToolParam(name = "limit", description = "最多返回几条，1 到 8") int limit
    ) {
        int clampedLimit = Math.max(1, Math.min(8, limit));
        return matchService.listMatches(context.userId(), scope, sportType, status).items().stream()
                .limit(clampedLimit)
                .map(this::toResult)
                .toList();
    }

    @Tool(name = "list_pending_confirmations", description = "查询当前用户待确认的比赛")
    public List<AssistantDtos.ResultDto> listPendingConfirmations(
            AssistantUserContext context,
            @ToolParam(name = "limit", description = "最多返回几条，1 到 8") int limit
    ) {
        return listMyMatches(context, "pending_confirmation", null, MatchStatus.PENDING, limit);
    }

    private AssistantDtos.ResultDto toResult(MatchDtos.MatchDetailDto match) {
        String title = match.sportType() + " · " + match.status();
        String subtitle = match.participants().stream()
                .map(MatchDtos.MatchParticipantDto::nickname)
                .collect(Collectors.joining(" / "));
        return new AssistantDtos.ResultDto("MATCH", title, subtitle, match.id());
    }

    public record AssistantUserContext(Long userId) {
    }
}
