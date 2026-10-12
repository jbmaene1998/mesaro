package com.mesaro.availability;

import com.mesaro.hold.HoldRepository;
import com.mesaro.infra.TimeService;
import com.mesaro.reservation.ReservationRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Implementation of OverlapCheckRepository that checks both holds and reservations.
 */
@Repository
@Primary
public class HoldOverlapCheckRepository implements OverlapCheckRepository {

    private final HoldRepository holdRepository;
    private final ReservationRepository reservationRepository;
    private final TimeService timeService;

    public HoldOverlapCheckRepository(HoldRepository holdRepository,
                                       ReservationRepository reservationRepository,
                                       TimeService timeService) {
        this.holdRepository = holdRepository;
        this.reservationRepository = reservationRepository;
        this.timeService = timeService;
    }

    @Override
    public Set<Long> findTablesWithOverlappingReservations(List<Long> tableIds, Instant startUtc, Instant endUtc) {
        if (tableIds == null || tableIds.isEmpty()) {
            return Set.of();
        }
        return reservationRepository.findTableIdsWithOverlappingReservations(tableIds, startUtc, endUtc);
    }

    @Override
    public Set<Long> findTablesWithActiveHolds(List<Long> tableIds, Instant startUtc, Instant endUtc) {
        if (tableIds == null || tableIds.isEmpty()) {
            return Set.of();
        }
        Instant now = timeService.now();
        return holdRepository.findTableIdsWithActiveHolds(tableIds, startUtc, endUtc, now);
    }

    @Override
    public int countCoversForShift(Long shiftId, Instant startUtc, Instant endUtc) {
        return reservationRepository.countCoversForShift(shiftId, startUtc, endUtc);
    }
}
