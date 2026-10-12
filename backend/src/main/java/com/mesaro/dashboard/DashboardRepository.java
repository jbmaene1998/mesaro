package com.mesaro.dashboard;

import com.mesaro.reservation.Reservation;
import com.mesaro.reservation.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

/**
 * Repository for dashboard aggregation queries.
 * All queries are optimized with JOIN FETCH to avoid N+1.
 */
@Repository
public interface DashboardRepository extends JpaRepository<Reservation, Long> {

    /**
     * Count reservations by status for a date range.
     * Returns: [status, count]
     */
    @Query("SELECT r.status, COUNT(r) FROM Reservation r " +
            "WHERE r.restaurant.id = :restaurantId " +
            "AND r.startAtUtc >= :startUtc AND r.startAtUtc < :endUtc " +
            "GROUP BY r.status")
    List<Object[]> countByStatusForDateRange(Long restaurantId, Instant startUtc, Instant endUtc);

    /**
     * Sum covers (party size) by status for a date range.
     * Returns: [status, totalCovers]
     */
    @Query("SELECT r.status, COALESCE(SUM(r.partySize), 0) FROM Reservation r " +
            "WHERE r.restaurant.id = :restaurantId " +
            "AND r.startAtUtc >= :startUtc AND r.startAtUtc < :endUtc " +
            "GROUP BY r.status")
    List<Object[]> sumCoversByStatusForDateRange(Long restaurantId, Instant startUtc, Instant endUtc);

    /**
     * Count covers for a specific shift on a date.
     */
    @Query("SELECT COALESCE(SUM(r.partySize), 0) FROM Reservation r " +
            "WHERE r.shift.id = :shiftId " +
            "AND r.status IN ('CONFIRMED', 'SEATED') " +
            "AND r.startAtUtc >= :startUtc AND r.startAtUtc < :endUtc")
    int countCoversForShift(Long shiftId, Instant startUtc, Instant endUtc);

    /**
     * Count reservations for a specific shift on a date.
     */
    @Query("SELECT COUNT(r) FROM Reservation r " +
            "WHERE r.shift.id = :shiftId " +
            "AND r.status IN ('CONFIRMED', 'SEATED') " +
            "AND r.startAtUtc >= :startUtc AND r.startAtUtc < :endUtc")
    int countReservationsForShift(Long shiftId, Instant startUtc, Instant endUtc);

    /**
     * Get upcoming reservations with tables eagerly loaded.
     * Limited to avoid memory issues.
     */
    @Query("SELECT DISTINCT r FROM Reservation r " +
            "LEFT JOIN FETCH r.tables " +
            "LEFT JOIN FETCH r.shift " +
            "WHERE r.restaurant.id = :restaurantId " +
            "AND r.status IN :statuses " +
            "AND r.startAtUtc >= :fromUtc " +
            "AND r.startAtUtc < :toUtc " +
            "ORDER BY r.startAtUtc")
    List<Reservation> findUpcomingWithTables(Long restaurantId, List<ReservationStatus> statuses,
                                              Instant fromUtc, Instant toUtc);

    /**
     * Get all reservations for a day with tables eagerly loaded.
     */
    @Query("SELECT DISTINCT r FROM Reservation r " +
            "LEFT JOIN FETCH r.tables " +
            "LEFT JOIN FETCH r.shift " +
            "WHERE r.restaurant.id = :restaurantId " +
            "AND r.startAtUtc >= :startUtc AND r.startAtUtc < :endUtc " +
            "ORDER BY r.startAtUtc")
    List<Reservation> findAllForDayWithTables(Long restaurantId, Instant startUtc, Instant endUtc);

    @Query("SELECT DISTINCT r FROM Reservation r " +
            "LEFT JOIN FETCH r.tables " +
            "WHERE r.restaurant.id = :restaurantId " +
            "AND r.status IN ('CONFIRMED', 'SEATED') " +
            "AND r.startAtUtc >= :startUtc AND r.startAtUtc < :endUtc " +
            "ORDER BY r.startAtUtc")
    List<Reservation> findLiveServiceReservations(Long restaurantId, Instant startUtc, Instant endUtc);
}
