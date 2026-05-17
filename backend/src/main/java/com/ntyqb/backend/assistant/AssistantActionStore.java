package com.ntyqb.backend.assistant;

import com.ntyqb.backend.dto.MatchDtos;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AssistantActionStore {

    private static final long TTL_SECONDS = 600;

    private final Clock clock;
    private final Map<String, StoredAction> actions = new ConcurrentHashMap<>();

    public AssistantActionStore() {
        this(Clock.systemDefaultZone());
    }

    AssistantActionStore(Clock clock) {
        this.clock = clock;
    }

    public String putCreateMatch(Long userId, MatchDtos.CreateMatchRequest payload, String summary) {
        String id = UUID.randomUUID().toString();
        actions.put(id, new StoredAction(
                userId,
                "CREATE_MATCH",
                payload,
                summary,
                Instant.now(clock).plusSeconds(TTL_SECONDS)
        ));
        return id;
    }

    public Optional<StoredAction> consume(String id, Long userId) {
        StoredAction action = actions.remove(id);
        if (action == null || !action.userId().equals(userId) || action.expiresAt().isBefore(Instant.now(clock))) {
            return Optional.empty();
        }
        return Optional.of(action);
    }

    public record StoredAction(
            Long userId,
            String type,
            MatchDtos.CreateMatchRequest createMatchPayload,
            String summary,
            Instant expiresAt
    ) {
    }
}
