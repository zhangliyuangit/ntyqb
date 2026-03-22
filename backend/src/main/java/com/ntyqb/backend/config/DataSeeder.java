package com.ntyqb.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ntyqb.backend.entity.MatchFormat;
import com.ntyqb.backend.entity.MatchParticipant;
import com.ntyqb.backend.entity.MatchRecord;
import com.ntyqb.backend.entity.MatchStatus;
import com.ntyqb.backend.entity.ParticipantConfirmState;
import com.ntyqb.backend.entity.ParticipantRole;
import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.entity.TeamSide;
import com.ntyqb.backend.entity.User;
import com.ntyqb.backend.repository.MatchRecordRepository;
import com.ntyqb.backend.repository.UserRepository;
import com.ntyqb.backend.service.StatsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final MatchRecordRepository matchRecordRepository;
    private final StatsService statsService;
    private final ObjectMapper objectMapper;
    private final boolean seedEnabled;

    public DataSeeder(
            UserRepository userRepository,
            MatchRecordRepository matchRecordRepository,
            StatsService statsService,
            ObjectMapper objectMapper,
            @Value("${app.seed.enabled:true}") boolean seedEnabled
    ) {
        this.userRepository = userRepository;
        this.matchRecordRepository = matchRecordRepository;
        this.statsService = statsService;
        this.objectMapper = objectMapper;
        this.seedEnabled = seedEnabled;
    }

    @Override
    public void run(String... args) throws Exception {
        if (!seedEnabled || userRepository.count() > 0) {
            return;
        }

        User demo = createUser("mock:local-demo-user", "local-demo-user", "阿北");
        User zhou = createUser("mock:user-zhou", "user-zhou", "周周");
        User lin = createUser("mock:user-lin", "user-lin", "小林");
        User mia = createUser("mock:user-mia", "user-mia", "米娅");
        User tao = createUser("mock:user-tao", "user-tao", "涛子");
        User chen = createUser("mock:user-chen", "user-chen", "晨晨");

        seedConfirmedMatch(SportType.BILLIARDS, MatchFormat.SINGLES, demo, TeamSide.A, nowMinusDays(11),
                Map.of("winMarginBalls", 3, "remark", "手感在线"),
                List.of(
                        participant(demo, TeamSide.A, ParticipantRole.INITIATOR, ParticipantConfirmState.APPROVED),
                        participant(zhou, TeamSide.B, ParticipantRole.OPPONENT, ParticipantConfirmState.NOT_REQUIRED)
                ));
        seedConfirmedMatch(SportType.BILLIARDS, MatchFormat.SINGLES, lin, TeamSide.B, nowMinusDays(10),
                Map.of("winMarginBalls", 2, "remark", "翻盘局"),
                List.of(
                        participant(lin, TeamSide.A, ParticipantRole.INITIATOR, ParticipantConfirmState.APPROVED),
                        participant(demo, TeamSide.B, ParticipantRole.OPPONENT, ParticipantConfirmState.NOT_REQUIRED)
                ));
        seedConfirmedMatch(SportType.BILLIARDS, MatchFormat.SINGLES, demo, TeamSide.A, nowMinusDays(8),
                Map.of("winMarginBalls", 1, "remark", "拉锯战"),
                List.of(
                        participant(demo, TeamSide.A, ParticipantRole.INITIATOR, ParticipantConfirmState.APPROVED),
                        participant(mia, TeamSide.B, ParticipantRole.OPPONENT, ParticipantConfirmState.NOT_REQUIRED)
                ));

        seedConfirmedMatch(SportType.BADMINTON, MatchFormat.DOUBLES, demo, TeamSide.A, nowMinusDays(7),
                Map.of("isDoubles", true, "sets", List.of(
                        Map.of("aScore", 21, "bScore", 18),
                        Map.of("aScore", 18, "bScore", 21),
                        Map.of("aScore", 21, "bScore", 15)
                ), "remark", "默契球"),
                List.of(
                        participant(demo, TeamSide.A, ParticipantRole.INITIATOR, ParticipantConfirmState.APPROVED),
                        participant(lin, TeamSide.A, ParticipantRole.TEAMMATE, ParticipantConfirmState.APPROVED),
                        participant(zhou, TeamSide.B, ParticipantRole.OPPONENT, ParticipantConfirmState.NOT_REQUIRED),
                        participant(mia, TeamSide.B, ParticipantRole.OPPONENT, ParticipantConfirmState.NOT_REQUIRED)
                ));
        seedConfirmedMatch(SportType.BADMINTON, MatchFormat.SINGLES, tao, TeamSide.B, nowMinusDays(5),
                Map.of("isDoubles", false, "sets", List.of(
                        Map.of("aScore", 18, "bScore", 21),
                        Map.of("aScore", 21, "bScore", 19),
                        Map.of("aScore", 17, "bScore", 21)
                ), "remark", "体能局"),
                List.of(
                        participant(demo, TeamSide.A, ParticipantRole.OPPONENT, ParticipantConfirmState.NOT_REQUIRED),
                        participant(tao, TeamSide.B, ParticipantRole.INITIATOR, ParticipantConfirmState.APPROVED)
                ));
        seedConfirmedMatch(SportType.BADMINTON, MatchFormat.SINGLES, chen, TeamSide.A, nowMinusDays(3),
                Map.of("isDoubles", false, "sets", List.of(
                        Map.of("aScore", 21, "bScore", 14),
                        Map.of("aScore", 21, "bScore", 12)
                ), "remark", "快节奏"),
                List.of(
                        participant(chen, TeamSide.A, ParticipantRole.INITIATOR, ParticipantConfirmState.APPROVED),
                        participant(zhou, TeamSide.B, ParticipantRole.OPPONENT, ParticipantConfirmState.NOT_REQUIRED)
                ));

        seedConfirmedMatch(SportType.TABLE_TENNIS, MatchFormat.SINGLES, demo, TeamSide.A, nowMinusDays(6),
                Map.of("bestOf", 5, "sets", List.of(
                        Map.of("aScore", 11, "bScore", 8),
                        Map.of("aScore", 11, "bScore", 9),
                        Map.of("aScore", 8, "bScore", 11),
                        Map.of("aScore", 11, "bScore", 6)
                ), "remark", "前三板压制"),
                List.of(
                        participant(demo, TeamSide.A, ParticipantRole.INITIATOR, ParticipantConfirmState.APPROVED),
                        participant(zhou, TeamSide.B, ParticipantRole.OPPONENT, ParticipantConfirmState.NOT_REQUIRED)
                ));
        seedConfirmedMatch(SportType.TABLE_TENNIS, MatchFormat.SINGLES, mia, TeamSide.B, nowMinusDays(4),
                Map.of("bestOf", 5, "sets", List.of(
                        Map.of("aScore", 9, "bScore", 11),
                        Map.of("aScore", 10, "bScore", 12),
                        Map.of("aScore", 11, "bScore", 7),
                        Map.of("aScore", 8, "bScore", 11)
                ), "remark", "发接发见高低"),
                List.of(
                        participant(mia, TeamSide.A, ParticipantRole.INITIATOR, ParticipantConfirmState.APPROVED),
                        participant(demo, TeamSide.B, ParticipantRole.OPPONENT, ParticipantConfirmState.NOT_REQUIRED)
                ));

        seedPendingMatch(SportType.BILLIARDS, MatchFormat.SINGLES, zhou, TeamSide.B, nowMinusDays(1),
                Map.of("winMarginBalls", 2, "remark", "待确认"),
                List.of(
                        participant(zhou, TeamSide.A, ParticipantRole.INITIATOR, ParticipantConfirmState.APPROVED),
                        participant(demo, TeamSide.B, ParticipantRole.OPPONENT, ParticipantConfirmState.PENDING)
                ));
        seedPendingMatch(SportType.BADMINTON, MatchFormat.DOUBLES, demo, TeamSide.A, LocalDateTime.now().minusHours(12),
                Map.of("isDoubles", true, "sets", List.of(
                        Map.of("aScore", 21, "bScore", 18),
                        Map.of("aScore", 19, "bScore", 21),
                        Map.of("aScore", 21, "bScore", 17)
                ), "remark", "等对面确认"),
                List.of(
                        participant(demo, TeamSide.A, ParticipantRole.INITIATOR, ParticipantConfirmState.APPROVED),
                        participant(lin, TeamSide.A, ParticipantRole.TEAMMATE, ParticipantConfirmState.APPROVED),
                        participant(mia, TeamSide.B, ParticipantRole.OPPONENT, ParticipantConfirmState.PENDING),
                        participant(tao, TeamSide.B, ParticipantRole.OPPONENT, ParticipantConfirmState.PENDING)
                ));
        seedPendingMatch(SportType.TABLE_TENNIS, MatchFormat.SINGLES, demo, TeamSide.A, LocalDateTime.now().minusHours(5),
                Map.of("bestOf", 5, "sets", List.of(
                        Map.of("aScore", 11, "bScore", 5),
                        Map.of("aScore", 11, "bScore", 8),
                        Map.of("aScore", 8, "bScore", 11),
                        Map.of("aScore", 11, "bScore", 9)
                ), "remark", "晚间补录"),
                List.of(
                        participant(demo, TeamSide.A, ParticipantRole.INITIATOR, ParticipantConfirmState.APPROVED),
                        participant(zhou, TeamSide.B, ParticipantRole.OPPONENT, ParticipantConfirmState.PENDING)
                ));

        statsService.refreshAllStats();
    }

    private User createUser(String openId, String mockKey, String nickname) {
        User user = new User();
        user.setOpenId(openId);
        user.setMockKey(mockKey);
        user.setNickname(nickname);
        user.setAvatarUrl("");
        return userRepository.save(user);
    }

    private MatchParticipant participant(User user, TeamSide side, ParticipantRole role, ParticipantConfirmState confirmState) {
        MatchParticipant participant = new MatchParticipant();
        participant.setUser(user);
        participant.setSide(side);
        participant.setRole(role);
        participant.setConfirmState(confirmState);
        return participant;
    }

    private void seedConfirmedMatch(
            SportType sportType,
            MatchFormat format,
            User initiator,
            TeamSide winnerSide,
            LocalDateTime occurredAt,
            Map<String, Object> detail,
            List<MatchParticipant> participants
    ) throws Exception {
        MatchRecord record = baseMatch(sportType, format, initiator, winnerSide, occurredAt, detail, participants);
        record.setStatus(MatchStatus.CONFIRMED);
        record.setConfirmedAt(occurredAt.plusHours(2));
        matchRecordRepository.save(record);
    }

    private void seedPendingMatch(
            SportType sportType,
            MatchFormat format,
            User initiator,
            TeamSide winnerSide,
            LocalDateTime occurredAt,
            Map<String, Object> detail,
            List<MatchParticipant> participants
    ) throws Exception {
        MatchRecord record = baseMatch(sportType, format, initiator, winnerSide, occurredAt, detail, participants);
        record.setStatus(MatchStatus.PENDING);
        record.setExpiresAt(LocalDateTime.now().plusDays(7));
        matchRecordRepository.save(record);
    }

    private MatchRecord baseMatch(
            SportType sportType,
            MatchFormat format,
            User initiator,
            TeamSide winnerSide,
            LocalDateTime occurredAt,
            Map<String, Object> detail,
            List<MatchParticipant> participants
    ) throws Exception {
        MatchRecord record = new MatchRecord();
        record.setSportType(sportType);
        record.setFormat(format);
        record.setInitiator(initiator);
        record.setWinnerSide(winnerSide);
        record.setOccurredAt(occurredAt);
        record.setExpiresAt(occurredAt.plusDays(7));
        record.setDetailJson(objectMapper.writeValueAsString(detail));
        participants.forEach(record::addParticipant);
        return record;
    }

    private LocalDateTime nowMinusDays(long days) {
        return LocalDateTime.now().minusDays(days);
    }
}
