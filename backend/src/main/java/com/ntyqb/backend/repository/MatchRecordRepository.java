package com.ntyqb.backend.repository;

import com.ntyqb.backend.entity.MatchRecord;
import com.ntyqb.backend.entity.MatchStatus;
import com.ntyqb.backend.entity.SportType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MatchRecordRepository extends JpaRepository<MatchRecord, Long> {

    @EntityGraph(attributePaths = {"initiator", "participants", "participants.user"})
    @Query("""
            select distinct m from MatchRecord m
            left join fetch m.participants p
            left join fetch p.user
            where m.id = :id
            """)
    Optional<MatchRecord> findDetailedById(Long id);

    @EntityGraph(attributePaths = {"participants", "participants.user"})
    List<MatchRecord> findByStatusAndExpiresAtBefore(MatchStatus status, LocalDateTime dateTime);

    @EntityGraph(attributePaths = {"initiator", "participants", "participants.user"})
    @Query("""
            select m from MatchRecord m
            where (:sportType is null or m.sportType = :sportType)
              and (:status is null or m.status = :status)
            order by m.occurredAt desc, m.id desc
            """)
    List<MatchRecord> findAllVisible(SportType sportType, MatchStatus status);

    @EntityGraph(attributePaths = {"initiator", "participants", "participants.user"})
    @Query("""
            select m from MatchRecord m
            where exists (
                select 1 from MatchParticipant p
                where p.match = m and p.user.id = :userId
            )
              and (:sportType is null or m.sportType = :sportType)
              and (:status is null or m.status = :status)
            order by m.occurredAt desc, m.id desc
            """)
    List<MatchRecord> findAllByUserId(Long userId, SportType sportType, MatchStatus status);

    @EntityGraph(attributePaths = {"initiator", "participants", "participants.user"})
    @Query("""
            select m from MatchRecord m
            where exists (
                select 1 from MatchParticipant p
                where p.match = m and p.user.id = :userId
            )
              and m.status = com.ntyqb.backend.entity.MatchStatus.CONFIRMED
              and m.sportType = :sportType
            order by m.confirmedAt desc, m.id desc
            """)
    List<MatchRecord> findConfirmedByUserIdAndSportType(Long userId, SportType sportType);

    @EntityGraph(attributePaths = {"initiator", "participants", "participants.user"})
    @Query("""
            select m from MatchRecord m
            where exists (
                select 1 from MatchParticipant p
                where p.match = m and p.user.id = :userId
            )
              and m.status = com.ntyqb.backend.entity.MatchStatus.CONFIRMED
            order by m.confirmedAt desc, m.id desc
            """)
    List<MatchRecord> findConfirmedByUserId(Long userId);
}
