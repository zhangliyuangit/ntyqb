package com.ntyqb.backend.assistant;

import com.ntyqb.backend.dto.MatchDtos;

import java.util.List;
import java.util.Map;

public final class AssistantDtos {

    private AssistantDtos() {
    }

    public record ChatRequest(
            String conversationId,
            String message,
            MatchDtos.CreateMatchRequest draft
    ) {
    }

    public record ChatResponse(
            String conversationId,
            String reply,
            PendingActionDto pendingAction,
            List<ResultDto> results
    ) {
    }

    public record PendingActionDto(
            String id,
            String type,
            String summary,
            Map<String, Object> payload
    ) {
    }

    public record ResultDto(
            String type,
            String title,
            String subtitle,
            Long matchId
    ) {
    }

    public record ConfirmActionResponse(
            String reply,
            MatchDtos.MatchDetailDto match
    ) {
    }
}
