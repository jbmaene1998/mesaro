package com.mesaro.auth;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM EmailVerificationToken t WHERE t.tokenHash = :tokenHash")
    Optional<EmailVerificationToken> findByTokenHashForUpdate(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM EmailVerificationToken t WHERE t.user.id = :userId " +
            "AND t.usedAtUtc IS NULL AND t.expiresAtUtc > :now")
    Optional<EmailVerificationToken> findActiveByUserIdForUpdate(Long userId, Instant now);
}
