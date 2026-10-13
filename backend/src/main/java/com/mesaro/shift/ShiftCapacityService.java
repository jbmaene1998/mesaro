package com.mesaro.shift;

import com.mesaro.hold.HoldRepository;
import com.mesaro.infra.TimeService;
import com.mesaro.reservation.ReservationRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;

/**
 * Shared shift cover counting using the continuous service occurrence window
 * (handles overnight shifts that cross local midnight).
 */
@Service
public class ShiftCapacityService {

    private final ReservationRepository reservationRepository;
    private final HoldRepository holdRepository;
    private final TimeService timeService;

    public ShiftCapacityService(
            ReservationRepository reservationRepository,
            HoldRepository holdRepository,
            TimeService timeService) {
        this.reservationRepository = reservationRepository;
        this.holdRepository = holdRepository;
        this.timeService = timeService;
    }

    public record OccurrenceWindow(Instant startUtc, Instant endUtc, LocalDate serviceStartDate) {
    }

    /**
     * Occurrence window for a shift that serves {@code bookingDate} at {@code bookingTime}.
     */
    public OccurrenceWindow occurrenceWindow(Shift shift, LocalDate bookingDate, LocalTime bookingTime, ZoneId zone) {
        LocalDate serviceStartDate = resolveServiceStartDate(shift, bookingDate, bookingTime);
        return windowFromServiceStart(shift, serviceStartDate, zone);
    }

    /**
     * Occurrence window when iterating availability for a calendar {@code requestDate}
     * and a shift already known to apply that day (same-day or overnight carry-in).
     */
    public OccurrenceWindow occurrenceWindowForRequestDate(Shift shift, LocalDate requestDate, ZoneId zone) {
        int requestDow = requestDate.getDayOfWeek().getValue();
        int previousDow = requestDow == 1 ? 7 : requestDow - 1;
        LocalDate serviceStartDate;
        if (!shift.isOvernight()) {
            serviceStartDate = requestDate;
        } else if (shift.getDayOfWeek() == requestDow) {
            serviceStartDate = requestDate;
        } else if (shift.getDayOfWeek() == previousDow) {
            serviceStartDate = requestDate.minusDays(1);
        } else {
            serviceStartDate = requestDate;
        }
        return windowFromServiceStart(shift, serviceStartDate, zone);
    }

    public int countReservationCovers(Long shiftId, OccurrenceWindow window) {
        return reservationRepository.countCoversForShift(shiftId, window.startUtc(), window.endUtc());
    }

    public int countActiveHoldCovers(Long shiftId, OccurrenceWindow window, Instant now) {
        return holdRepository.countActiveHoldCoversForShift(shiftId, window.startUtc(), window.endUtc(), now);
    }

    public int totalCovers(Long shiftId, OccurrenceWindow window, Instant now) {
        return countReservationCovers(shiftId, window) + countActiveHoldCovers(shiftId, window, now);
    }

    /**
     * Whether {@code startLocal} + {@code durationMinutes} fits within the shift service end
     * on the continuous minute timeline for this booking.
     */
    public boolean durationFitsService(Shift shift, LocalDate bookingDate, LocalTime startLocal, int durationMinutes) {
        if (durationMinutes <= 0) {
            return false;
        }
        int startDay = shift.getDayOfWeek();
        int nextDay = startDay == 7 ? 1 : startDay + 1;
        int bookingDow = bookingDate.getDayOfWeek().getValue();
        int startMinute = startLocal.getHour() * 60 + startLocal.getMinute();
        if (shift.isOvernight() && bookingDow == nextDay) {
            startMinute += 24 * 60;
        } else if (bookingDow != startDay) {
            return false;
        }
        return startMinute + durationMinutes <= shift.serviceEndMinute();
    }

    private OccurrenceWindow windowFromServiceStart(Shift shift, LocalDate serviceStartDate, ZoneId zone) {
        Instant startUtc = timeService.toUtc(serviceStartDate, shift.getStartTime(), zone);
        LocalDate endDate = shift.isOvernight() ? serviceStartDate.plusDays(1) : serviceStartDate;
        Instant endUtc = timeService.toUtc(endDate, shift.getEndTime(), zone);
        if (!endUtc.isAfter(startUtc)) {
            // Defensive: zero-length or inverted — extend one minute so queries stay valid.
            endUtc = startUtc.plusSeconds(60);
        }
        return new OccurrenceWindow(startUtc, endUtc, serviceStartDate);
    }

    private LocalDate resolveServiceStartDate(Shift shift, LocalDate bookingDate, LocalTime bookingTime) {
        int bookingDow = bookingDate.getDayOfWeek().getValue();
        int startDay = shift.getDayOfWeek();
        int nextDay = startDay == 7 ? 1 : startDay + 1;
        if (shift.isOvernight() && bookingDow == nextDay) {
            return bookingDate.minusDays(1);
        }
        if (bookingDow == startDay) {
            return bookingDate;
        }
        // Unexpected day — still attribute to booking date for capacity safety.
        return bookingDate;
    }
}
