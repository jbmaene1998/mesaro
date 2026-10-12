package com.mesaro.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenAndRevokedFalse(String token);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RefreshToken r WHERE r.token = :token AND r.revoked = false")
    Optional<RefreshToken> findActiveByTokenForUpdate(String token);

    Optional<RefreshToken> findByToken(String token);

    @Transactional
    @Modifying
    @Query("UPDATE RefreshToken r SET r.revoked = true WHERE r.user.id = :userId AND r.revoked = false")
    int revokeAllForUser(Long userId);

    @Transactional
    @Modifying
    long deleteByUser_Id(Long userId);

    @Transactional
    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.user.id = :userId AND (r.revoked = true OR r.expiresAtUtc < :cutoff)")
    int deleteByUserIdAndRevokedOrExpired(Long userId, Instant cutoff);

    @Query("SELECT new com.mesaro.auth.UserLastLogin(r.user.id, MAX(r.createdAtUtc)) " +
            "FROM RefreshToken r " +
            "WHERE r.user.id IN :userIds " +
            "GROUP BY r.user.id")
    List<UserLastLogin> findLastLoginByUserIds(List<Long> userIds);
}
