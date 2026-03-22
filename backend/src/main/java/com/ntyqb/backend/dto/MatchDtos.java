package com.ntyqb.backend.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.ntyqb.backend.entity.MatchFormat;
import com.ntyqb.backend.entity.MatchStatus;
import com.ntyqb.backend.entity.ParticipantConfirmState;
import com.ntyqb.backend.entity.ParticipantRole;
import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.entity.TeamSide;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;

public final class MatchDtos {

    private MatchDtos() {
    }

    public record SetScoreDto(
            Integer aScore,
            Integer bScore
    ) {
    }

    public record CreateMatchRequest(
            @NotNull(message = "sportType 不能为空")
            SportType sportType,
            @NotNull(message = "format 不能为空")
            MatchFormat format,
            LocalDateTime occurredAt,
            @NotNull(message = "winnerSide 不能为空")
            TeamSide winnerSide,
            List<Long> participantIdsA,
            List<Long> participantIdsB,
            Integer winMarginBalls,
            Integer bestOf,
            List<SetScoreDto> sets,
            String remark
    ) {
    }

    public record MatchParticipantDto(
            Long userId,
            String nickname,
            String avatarUrl,
            String tag,
            TeamSide side,
            ParticipantRole role,
            ParticipantConfirmState confirmState
    ) {
    }

    public record MatchDetailDto(
            Long id,
            SportType sportType,
            MatchFormat format,
            MatchStatus status,
            LocalDateTime occurredAt,
            LocalDateTime confirmedAt,
            LocalDateTime expiresAt,
            TeamSide winnerSide,
            Long initiatorId,
            String initiatorName,
            JsonNode detail,
            List<MatchParticipantDto> participants,
            boolean canConfirm,
            boolean canReject,
            boolean canCancel
    ) {
    }

    public record MatchListResponse(
            List<MatchDetailDto> items
    ) {
    }

    public record RecentPlayerDto(
            Long id,
            String nickname,
            String avatarUrl,
            String tag,
            LocalDateTime lastPlayedAt,
            int opponentCount,
            int teammateCount
    ) {
    }

    public record PlayerProfileResponse(
            AuthDtos.UserSummaryDto user,
            AuthDtos.SportStatDto stat,
            List<MatchDetailDto> recentMatches
    ) {
    }
}
