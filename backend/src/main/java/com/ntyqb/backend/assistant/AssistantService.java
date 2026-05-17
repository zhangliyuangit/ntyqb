package com.ntyqb.backend.assistant;

import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.entity.User;
import com.ntyqb.backend.exception.BadRequestException;
import com.ntyqb.backend.service.MatchService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AssistantService {

    private final AssistantProperties properties;
    private final AssistantActionStore actionStore;
    private final MatchService matchService;
    private final MatchAssistantTools matchAssistantTools;

    public AssistantService(
            AssistantProperties properties,
            AssistantActionStore actionStore,
            MatchService matchService,
            MatchAssistantTools matchAssistantTools
    ) {
        this.properties = properties;
        this.actionStore = actionStore;
        this.matchService = matchService;
        this.matchAssistantTools = matchAssistantTools;
    }

    public AssistantDtos.ChatResponse chat(AssistantDtos.ChatRequest request, User currentUser) {
        String conversationId = request.conversationId() == null || request.conversationId().isBlank()
                ? UUID.randomUUID().toString()
                : request.conversationId();
        String message = request.message() == null ? "" : request.message().trim();
        if (message.contains("待确认")) {
            return new AssistantDtos.ChatResponse(
                    conversationId,
                    "下面是你待确认的比赛。",
                    null,
                    matchAssistantTools.listPendingConfirmations(currentUser.getId(), 6)
            );
        }
        if (message.contains("台球") && (message.contains("最近") || message.contains("记录"))) {
            return new AssistantDtos.ChatResponse(
                    conversationId,
                    "下面是你最近的台球记录。",
                    null,
                    matchAssistantTools.listMyMatches(currentUser.getId(), "mine", SportType.BILLIARDS, null, 6)
            );
        }
        if (!properties.isModelConfigured()) {
            return new AssistantDtos.ChatResponse(
                    conversationId,
                    "记录助手暂未开启",
                    null,
                    List.of()
            );
        }
        return new AssistantDtos.ChatResponse(
                conversationId,
                "记录助手正在接入中",
                null,
                List.of()
        );
    }

    public AssistantDtos.ConfirmActionResponse confirmAction(String actionId, User currentUser) {
        AssistantActionStore.StoredAction action = actionStore.consume(actionId, currentUser.getId())
                .orElseThrow(() -> new BadRequestException("待确认动作已过期，请重新描述一次"));
        if (!"CREATE_MATCH".equals(action.type())) {
            throw new BadRequestException("暂不支持该确认动作");
        }
        return new AssistantDtos.ConfirmActionResponse(
                "已发起比赛记录，等待对手确认后会进入正式统计。",
                matchService.createMatch(action.createMatchPayload(), currentUser)
        );
    }
}
