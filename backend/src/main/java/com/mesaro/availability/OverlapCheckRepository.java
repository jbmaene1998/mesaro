package com.mesaro.availability;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Repository interface for checking reservation and hold overlaps.
 * Implementations will be provided when Reservation and Hold entities exist.
 */
public interface OverlapCheckRepository {

    /**
     * Find table IDs that have overlapping confirmed reservations.
     *
     * @param tableIds   The tables to check
     * @param startUtc   Start time (inclusive)
     * @param endUtc     End time (exclusive)
     * @return Set of table IDs that have conflicts
     */
    Set<Long> findTablesWithOverlappingReservations(List<Long> tableIds, Instant startUtc, Instant endUtc);

    /**
     * Find table IDs that have active (non-expired) holds.
     *
     * @param tableIds   The tables to check
     * @param startUtc   Start time (inclusive)
     * @param endUtc     End time (exclusive)
     * @return Set of table IDs that have active holds
     */
    Set<Long> findTablesWithActiveHolds(List<Long> tableIds, Instant startUtc, Instant endUtc);

    /**
     * Count current covers (confirmed reservations) for a shift on a date.
     *
     * @param shiftId    The shift ID
     * @param startUtc   Start of the day in UTC
     * @param endUtc     End of the day in UTC
     * @return Total covers booked
     */
    int countCoversForShift(Long shiftId, Instant startUtc, Instant endUtc);
}
