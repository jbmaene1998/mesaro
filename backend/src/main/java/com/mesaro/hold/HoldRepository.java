package com.mesaro.hold;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface HoldRepository extends JpaRepository<Hold, Long> {

    Optional<Hold> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT h FROM Hold h WHERE h.tokenHash = :tokenHash")
    Optional<Hold> findByTokenHashForUpdate(String tokenHash);

    @Query("SELECT h FROM Hold h WHERE h.tokenHash = :tokenHash AND h.confirmed = false")
    Optional<Hold> findActiveByTokenHash(String tokenHash);

    /**
     * Find active (non-expired, non-confirmed) holds that overlap with a time range
     * for specific tables.
     */
    @Query("SELECT DISTINCT h FROM Hold h JOIN h.tables t " +
            "WHERE t.id IN :tableIds " +
            "AND h.confirmed = false " +
            "AND h.expiresAtUtc > :now " +
            "AND h.startAtUtc < :endUtc " +
            "AND h.endAtUtc > :startUtc")
    List<Hold> findActiveOverlappingHolds(List<Long> tableIds, Instant startUtc, Instant endUtc, Instant now);

    /**
     * Find table IDs from the given list that have active holds overlapping the time range.
     */
    @Query("SELECT DISTINCT t.id FROM Hold h JOIN h.tables t " +
            "WHERE t.id IN :tableIds " +
            "AND h.confirmed = false " +
            "AND h.expiresAtUtc > :now " +
            "AND h.startAtUtc < :endUtc " +
            "AND h.endAtUtc > :startUtc")
    Set<Long> findTableIdsWithActiveHolds(List<Long> tableIds, Instant startUtc, Instant endUtc, Instant now);

    /**
     * Check if any active hold exists for the given tables in the time range.
     */
    @Query("SELECT CASE WHEN COUNT(h) > 0 THEN true ELSE false END " +
            "FROM Hold h JOIN h.tables t " +
            "WHERE t.id IN :tableIds " +
            "AND h.confirmed = false " +
            "AND h.expiresAtUtc > :now " +
            "AND h.startAtUtc < :endUtc " +
            "AND h.endAtUtc > :startUtc")
    boolean existsActiveHoldForTables(List<Long> tableIds, Instant startUtc, Instant endUtc, Instant now);

    /**
     * Delete expired holds (cleanup job).
     */
    @Modifying
    @Query("DELETE FROM Hold h WHERE h.confirmed = false AND h.expiresAtUtc < :cutoff")
    int deleteExpiredHolds(Instant cutoff);

    interface ExpiredHoldDeletion {
        Long getId();
        Long getRestaurantId();
        Instant getStartAtUtc();
        Instant getEndAtUtc();
    }

    @Modifying
    @Query(value = """
            WITH locked AS (
                SELECT id, restaurant_id, start_at_utc, end_at_utc
                FROM hold
                WHERE expires_at_utc < :cutoff
                  AND confirmed = false
                FOR UPDATE SKIP LOCKED
            ),
            deleted AS (
                DELETE FROM hold h
                USING locked l
                WHERE h.id = l.id
                RETURNING l.id, l.restaurant_id, l.start_at_utc, l.end_at_utc
            )
            SELECT id, restaurant_id AS restaurantId, start_at_utc AS startAtUtc, end_at_utc AS endAtUtc
            FROM deleted
            """, nativeQuery = true)
    List<ExpiredHoldDeletion> deleteExpiredHoldsSkipLocked(Instant cutoff);

    @Query("SELECT COALESCE(SUM(h.partySize), 0) FROM Hold h " +
            "JOIN h.tables t " +
            "WHERE h.shift.id = :shiftId " +
            "AND h.confirmed = false " +
            "AND h.expiresAtUtc > :now " +
            "AND h.startAtUtc >= :dayStart " +
            "AND h.startAtUtc < :dayEnd")
    int countActiveHoldCoversForShift(Long shiftId, Instant dayStart, Instant dayEnd, Instant now);

    @Query("SELECT COUNT(DISTINCT h.id) FROM Hold h " +
            "JOIN h.tables t " +
            "WHERE t.id = :tableId " +
            "AND h.confirmed = false " +
            "AND h.expiresAtUtc > :now")
    long countActiveHoldsForTable(Long tableId, Instant now);

    @Modifying
    @Query("DELETE FROM Hold h WHERE h.shift.id = :shiftId " +
            "AND h.confirmed = false " +
            "AND h.expiresAtUtc > :now")
    int deleteActiveHoldsByShiftId(Long shiftId, Instant now);

    @Modifying
    @Query(value = """
            DELETE FROM hold h
            USING hold_table ht
            WHERE ht.hold_id = h.id
              AND ht.table_id = :tableId
              AND h.confirmed = false
              AND h.expires_at_utc > :now
            """, nativeQuery = true)
    int deleteActiveHoldsForTable(Long tableId, Instant now);

    /**
     * Find all expired, unconfirmed holds.
     */
    @Query("SELECT h FROM Hold h WHERE h.confirmed = false AND h.expiresAtUtc < :now")
    List<Hold> findExpiredHolds(Instant now);

    boolean existsByShift_Id(Long shiftId);

    boolean existsByTables_Id(Long tableId);

    @Modifying
    long deleteByRestaurant_Id(Long restaurantId);
}
