package com.ntyqb.backend.assistant;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class AssistantActionStoreTests {

    @Test
    void shouldNotConsumeActionForWrongUser() {
        AssistantActionStore store = new AssistantActionStore(
                Clock.fixed(Instant.parse("2026-05-17T10:00:00Z"), ZoneOffset.UTC)
        );
        String actionId = store.putCreateMatch(1L, null, "创建比赛");

        assertThat(store.consume(actionId, 2L)).isEmpty();
        assertThat(store.consume(actionId, 1L)).isPresent();
        assertThat(store.consume(actionId, 1L)).isEmpty();
    }

    @Test
    void shouldCleanupExpiredActionWhenConsumed() {
        MutableClock clock = new MutableClock(Instant.parse("2026-05-17T10:00:00Z"));
        AssistantActionStore store = new AssistantActionStore(clock);
        String actionId = store.putCreateMatch(1L, null, "创建比赛");

        clock.advance(Duration.ofSeconds(601));

        assertThat(store.consume(actionId, 1L)).isEmpty();
        assertThat(store.consume(actionId, 1L)).isEmpty();
    }

    private static final class MutableClock extends Clock {

        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        private void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
