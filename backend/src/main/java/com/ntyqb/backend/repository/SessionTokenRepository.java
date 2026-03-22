package com.ntyqb.backend.repository;

import com.ntyqb.backend.entity.SessionToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface SessionTokenRepository extends JpaRepository<SessionToken, Long> {

    Optional<SessionToken> findByToken(String token);

    void deleteByToken(String token);

    void deleteByExpiresAtBefore(LocalDateTime dateTime);
}
