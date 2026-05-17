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

    boolean contains(String id) {
        return actions.containsKey(id);
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
        StoredAction action = actions.get(id);
        if (action == null) {
            return Optional.empty();
        }
        if (action.expiresAt().isBefore(Instant.now(clock))) {
            actions.remove(id, action);
            return Optional.empty();
        }
        if (!action.userId().equals(userId)) {
            return Optional.empty();
        }
        if (actions.remove(id, action)) {
            return Optional.of(action);
        }
        return Optional.empty();
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
