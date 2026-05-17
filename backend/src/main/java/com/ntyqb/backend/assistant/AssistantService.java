package com.ntyqb.backend.assistant;

import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.entity.User;
import com.ntyqb.backend.exception.BadRequestException;
import com.ntyqb.backend.service.MatchService;
import io.agentscope.core.ReActAgent;
import io.agentscope.core.message.Msg;
import io.agentscope.core.model.DashScopeChatModel;
import io.agentscope.core.tool.ToolExecutionContext;
import io.agentscope.core.tool.Toolkit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class AssistantService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AssistantService.class);
    private static final Duration MODEL_TIMEOUT = Duration.ofSeconds(20);

    private final AssistantProperties properties;
    private final AssistantActionStore actionStore;
    private final MatchService matchService;
    private final MatchAssistantTools matchAssistantTools;
    private final AssistantPromptFactory promptFactory;
    private final Toolkit toolkit;

    public AssistantService(
            AssistantProperties properties,
            AssistantActionStore actionStore,
            MatchService matchService,
            MatchAssistantTools matchAssistantTools,
            AssistantPromptFactory promptFactory
    ) {
        this.properties = properties;
        this.actionStore = actionStore;
        this.matchService = matchService;
        this.matchAssistantTools = matchAssistantTools;
        this.promptFactory = promptFactory;
        this.toolkit = new Toolkit();
        this.toolkit.registerTool(matchAssistantTools);
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
                    matchAssistantTools.listPendingConfirmations(userContext(currentUser), 6)
            );
        }
        if (message.contains("台球") && (message.contains("最近") || message.contains("记录"))) {
            return new AssistantDtos.ChatResponse(
                    conversationId,
                    "下面是你最近的台球记录。",
                    null,
                    matchAssistantTools.listMyMatches(userContext(currentUser), "mine", SportType.BILLIARDS, null, 6)
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
        try {
            ToolExecutionContext context = ToolExecutionContext.builder()
                    .register(userContext(currentUser))
                    .build();
            ReActAgent agent = ReActAgent.builder()
                    .name("NtyqbAssistant")
                    .sysPrompt(promptFactory.systemPrompt())
                    .model(DashScopeChatModel.builder()
                            .apiKey(properties.getApiKey())
                            .modelName(properties.getModelName())
                            .build())
                    .toolkit(toolkit)
                    .toolExecutionContext(context)
                    .maxIters(6)
                    .build();
            Msg response = agent.call(Msg.builder().textContent(message).build()).block(MODEL_TIMEOUT);
            String reply = response == null || response.getTextContent() == null
                    ? "刚刚没听清，可以换个说法再试一次"
                    : response.getTextContent();
            return new AssistantDtos.ChatResponse(conversationId, reply, null, List.of());
        } catch (Exception exception) {
            LOGGER.warn("Assistant model call failed", exception);
            return new AssistantDtos.ChatResponse(
                    conversationId,
                    "记录助手暂时不可用，可以稍后再试",
                    null,
                    List.of()
            );
        }
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

    private MatchAssistantTools.AssistantUserContext userContext(User currentUser) {
        return new MatchAssistantTools.AssistantUserContext(currentUser.getId());
    }
}
