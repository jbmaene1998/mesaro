package com.mesaro.reservation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    Optional<Reservation> findByConfirmationCode(String confirmationCode);

    @Query("SELECT DISTINCT r FROM Reservation r " +
            "JOIN FETCH r.restaurant " +
            "LEFT JOIN FETCH r.shift " +
            "LEFT JOIN FETCH r.tables " +
            "WHERE r.confirmationCode = :confirmationCode")
    Optional<Reservation> findByConfirmationCodeWithAssociations(String confirmationCode);

    Optional<Reservation> findByCancelTokenHash(String cancelTokenHash);

    @Query("SELECT DISTINCT r FROM Reservation r " +
            "JOIN FETCH r.restaurant " +
            "LEFT JOIN FETCH r.shift " +
            "LEFT JOIN FETCH r.tables " +
            "WHERE r.cancelTokenHash = :cancelTokenHash")
    Optional<Reservation> findByCancelTokenHashWithAssociations(String cancelTokenHash);

    @Query("SELECT DISTINCT r FROM Reservation r " +
            "JOIN FETCH r.restaurant " +
            "LEFT JOIN FETCH r.shift " +
            "LEFT JOIN FETCH r.tables " +
            "WHERE r.confirmationCode = :confirmationCode " +
            "AND r.cancelTokenHash = :cancelTokenHash")
    Optional<Reservation> findByConfirmationCodeAndCancelTokenHashWithAssociations(
            String confirmationCode, String cancelTokenHash);

    @Query("SELECT DISTINCT r FROM Reservation r " +
            "JOIN FETCH r.restaurant " +
            "LEFT JOIN FETCH r.shift " +
            "LEFT JOIN FETCH r.tables " +
            "WHERE r.id = :id")
    Optional<Reservation> findByIdWithAssociations(Long id);

    List<Reservation> findByRestaurantIdAndStatusOrderByStartAtUtc(Long restaurantId, ReservationStatus status);

    @Query("SELECT r FROM Reservation r WHERE r.restaurant.id = :restaurantId " +
            "AND r.startAtUtc >= :startUtc AND r.startAtUtc < :endUtc " +
            "ORDER BY r.startAtUtc")
    List<Reservation> findByRestaurantAndDateRange(Long restaurantId, Instant startUtc, Instant endUtc);

    @Query("SELECT DISTINCT r FROM Reservation r " +
            "JOIN FETCH r.restaurant " +
            "LEFT JOIN FETCH r.shift " +
            "LEFT JOIN FETCH r.tables " +
            "WHERE r.restaurant.id = :restaurantId " +
            "AND r.startAtUtc >= :startUtc AND r.startAtUtc < :endUtc " +
            "ORDER BY r.startAtUtc")
    List<Reservation> findByRestaurantAndDateRangeWithAssociations(Long restaurantId, Instant startUtc, Instant endUtc);

    @Query("SELECT r FROM Reservation r WHERE r.restaurant.id = :restaurantId " +
            "AND r.status IN :statuses " +
            "AND r.startAtUtc >= :startUtc AND r.startAtUtc < :endUtc " +
            "ORDER BY r.startAtUtc")
    List<Reservation> findByRestaurantAndDateRangeAndStatus(Long restaurantId, Instant startUtc, Instant endUtc,
                                                             List<ReservationStatus> statuses);

    @Query("SELECT r FROM Reservation r WHERE r.restaurant.id = :restaurantId " +
            "AND r.startAtUtc >= :startUtc AND r.startAtUtc < :endUtc " +
            "AND r.status IN :statuses " +
            "ORDER BY r.startAtUtc")
    List<Reservation> findByRestaurantAndDateRangeWithStatus(Long restaurantId,
                                                              Instant startUtc,
                                                              Instant endUtc,
                                                              List<ReservationStatus> statuses);

    @Query("SELECT DISTINCT r FROM Reservation r " +
            "JOIN FETCH r.restaurant " +
            "LEFT JOIN FETCH r.shift " +
            "LEFT JOIN FETCH r.tables " +
            "WHERE r.restaurant.id = :restaurantId " +
            "AND r.status IN :statuses " +
            "AND r.startAtUtc >= :startUtc AND r.startAtUtc < :endUtc " +
            "ORDER BY r.startAtUtc")
    List<Reservation> findByRestaurantAndDateRangeAndStatusWithAssociations(Long restaurantId, Instant startUtc, Instant endUtc,
                                                                             List<ReservationStatus> statuses);

    @Query("SELECT r FROM Reservation r " +
            "JOIN FETCH r.restaurant " +
            "WHERE r.status = 'CONFIRMED' " +
            "AND r.startAtUtc >= :startUtc " +
            "AND r.startAtUtc < :endUtc " +
            "ORDER BY r.startAtUtc")
    List<Reservation> findConfirmedStartingBetweenWithRestaurant(Instant startUtc, Instant endUtc);

    /**
     * Find table IDs that have overlapping active reservations.
     */
    @Query("SELECT DISTINCT t.id FROM Reservation r JOIN r.tables t " +
            "WHERE t.id IN :tableIds " +
            "AND r.status IN ('CONFIRMED', 'SEATED') " +
            "AND r.startAtUtc < :endUtc " +
            "AND r.endAtUtc > :startUtc")
    Set<Long> findTableIdsWithOverlappingReservations(List<Long> tableIds, Instant startUtc, Instant endUtc);

    /**
     * Check if any active reservation exists for the given tables in the time range.
     */
    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END " +
            "FROM Reservation r JOIN r.tables t " +
            "WHERE t.id IN :tableIds " +
            "AND r.status IN ('CONFIRMED', 'SEATED') " +
            "AND r.startAtUtc < :endUtc " +
            "AND r.endAtUtc > :startUtc")
    boolean existsActiveReservationForTables(List<Long> tableIds, Instant startUtc, Instant endUtc);

    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END " +
            "FROM Reservation r JOIN r.tables t " +
            "WHERE t.id IN :tableIds " +
            "AND r.id <> :excludeReservationId " +
            "AND r.status IN ('CONFIRMED', 'SEATED') " +
            "AND r.startAtUtc < :endUtc " +
            "AND r.endAtUtc > :startUtc")
    boolean existsActiveReservationForTablesExcluding(List<Long> tableIds,
                                                      Instant startUtc,
                                                      Instant endUtc,
                                                      Long excludeReservationId);

    /**
     * Count covers for a shift on a date.
     */
    @Query("SELECT COALESCE(SUM(r.partySize), 0) FROM Reservation r " +
            "WHERE r.shift.id = :shiftId " +
            "AND r.status IN ('CONFIRMED', 'SEATED') " +
            "AND r.startAtUtc >= :startUtc " +
            "AND r.startAtUtc < :endUtc")
    int countCoversForShift(Long shiftId, Instant startUtc, Instant endUtc);

    /**
     * Check if confirmation code exists (for uniqueness).
     */
    boolean existsByConfirmationCode(String confirmationCode);

    /**
     * Find reservations by guest email.
     */
    List<Reservation> findByGuestEmailOrderByStartAtUtcDesc(String guestEmail);

    boolean existsByShift_Id(Long shiftId);

    boolean existsByTables_Id(Long tableId);

    @Query("SELECT COUNT(r) FROM Reservation r " +
            "JOIN r.tables t " +
            "WHERE t.id = :tableId " +
            "AND r.status IN ('CONFIRMED', 'SEATED') " +
            "AND r.startAtUtc >= :now")
    long countUpcomingActiveReservationsForTable(Long tableId, Instant now);

    @Query("""
            SELECT COUNT(r) FROM Reservation r
            WHERE r.shift.id = :shiftId
              AND r.status IN ('CONFIRMED', 'SEATED')
              AND r.startAtUtc > :now
            """)
    long countUpcomingActiveByShift(Long shiftId, Instant now);

    @Query("""
            SELECT COUNT(r) FROM Reservation r
            WHERE r.restaurant.id = :restaurantId
              AND r.status IN ('CONFIRMED', 'SEATED')
              AND r.startAtUtc > :now
            """)
    long countUpcomingActiveByRestaurant(Long restaurantId, Instant now);

    @Modifying
    @Query(value = """
            UPDATE reservation
            SET guest_name = CONCAT('Deleted Guest #', id),
                guest_email = CONCAT('deleted+', id, '@anonymized.invalid'),
                guest_phone = NULL,
                notes = NULL,
                cancel_token_hash = NULL,
                cancel_token_expires_at_utc = NULL,
                updated_at = (NOW() AT TIME ZONE 'UTC')
            WHERE end_at_utc < :cutoff
              AND status IN ('COMPLETED', 'NO_SHOW', 'CANCELLED')
              AND guest_email NOT LIKE '%@anonymized.invalid'
            """, nativeQuery = true)
    int anonymizePersonalDataBefore(Instant cutoff);

    @Modifying
    long deleteByRestaurant_Id(Long restaurantId);
}
