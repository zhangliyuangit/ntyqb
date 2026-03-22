package com.ntyqb.backend.repository;

import com.ntyqb.backend.entity.SportStats;
import com.ntyqb.backend.entity.SportType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SportStatsRepository extends JpaRepository<SportStats, Long> {

    @EntityGraph(attributePaths = {"user"})
    Optional<SportStats> findByUserIdAndSportType(Long userId, SportType sportType);

    @EntityGraph(attributePaths = {"user"})
    List<SportStats> findBySportType(SportType sportType);
}
