package com.mesaro.staff;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface StaffInviteRepository extends JpaRepository<StaffInvite, Long> {

    @Query("SELECT i FROM StaffInvite i WHERE i.restaurant.id = :restaurantId " +
            "AND i.acceptedAtUtc IS NULL AND i.revokedAtUtc IS NULL AND i.expiresAtUtc > :now " +
            "ORDER BY i.createdAtUtc DESC")
    List<StaffInvite> findActiveByRestaurant(Long restaurantId, Instant now);

    @Query("SELECT i FROM StaffInvite i WHERE i.restaurant.id = :restaurantId " +
            "AND LOWER(i.email) = LOWER(:email) " +
            "AND i.acceptedAtUtc IS NULL AND i.revokedAtUtc IS NULL AND i.expiresAtUtc > :now " +
            "ORDER BY i.createdAtUtc DESC")
    Optional<StaffInvite> findLatestActiveByRestaurantAndEmail(Long restaurantId, String email, Instant now);

    @Query("SELECT i FROM StaffInvite i JOIN FETCH i.restaurant WHERE i.tokenHash = :tokenHash")
    Optional<StaffInvite> findByTokenHash(@Param("tokenHash") String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM StaffInvite i WHERE i.tokenHash = :tokenHash")
    Optional<StaffInvite> findByTokenHashForUpdate(String tokenHash);

    Optional<StaffInvite> findByIdAndRestaurant_Id(Long id, Long restaurantId);

    @Modifying
    long deleteByRestaurant_Id(Long restaurantId);

    @Modifying
    @Query("UPDATE StaffInvite i SET i.revokedAtUtc = :revokedAt " +
            "WHERE i.acceptedAtUtc IS NULL " +
            "AND i.revokedAtUtc IS NULL " +
            "AND i.expiresAtUtc < :now")
    int revokeExpiredInvites(Instant now, Instant revokedAt);

    @Modifying
    @Query("UPDATE StaffInvite si SET si.revokedAtUtc = :now " +
            "WHERE si.restaurant.id = :restaurantId " +
            "AND si.acceptedAtUtc IS NULL " +
            "AND si.revokedAtUtc IS NULL")
    int revokeAllPendingByRestaurant(Long restaurantId, Instant now);
}
