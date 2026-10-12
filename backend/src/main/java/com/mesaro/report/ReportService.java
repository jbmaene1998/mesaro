package com.mesaro.report;

import com.mesaro.common.exception.ValidationException;
import com.mesaro.infra.TimeService;
import com.mesaro.reservation.Reservation;
import com.mesaro.reservation.ReservationRepository;
import com.mesaro.reservation.ReservationStatus;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class ReportService {

    private final ReservationRepository reservationRepository;
    private final RestaurantService restaurantService;
    private final TimeService timeService;

    public ReportService(
            ReservationRepository reservationRepository,
            RestaurantService restaurantService,
            TimeService timeService) {
        this.reservationRepository = reservationRepository;
        this.restaurantService = restaurantService;
        this.timeService = timeService;
    }

    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'MANAGER')")
    public ReportSummaryResponse getSummary(Long restaurantId, LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new ValidationException("Start and end dates are required", "date");
        }
        if (endDate.isBefore(startDate)) {
            throw new ValidationException("End date must be on or after start date", "endDate");
        }
        if (ChronoUnit.DAYS.between(startDate, endDate) > 366) {
            throw new ValidationException("Date range cannot exceed 367 days", "endDate");
        }

        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());
        Instant startUtc = startDate.atStartOfDay(timezone).toInstant();
        Instant endUtcExclusive = endDate.plusDays(1).atStartOfDay(timezone).toInstant();

        List<Reservation> reservations = reservationRepository.findByRestaurantAndDateRangeWithAssociations(
                restaurantId, startUtc, endUtcExclusive);

        EnumMap<ReservationStatus, Integer> statusCounts = new EnumMap<>(ReservationStatus.class);
        Map<LocalDate, MutableDaily> byDay = new HashMap<>();
        Map<String, MutableShift> byShift = new HashMap<>();

        int totalReservations = 0;
        int totalCovers = 0;
        int partySizeSum = 0;

        for (Reservation reservation : reservations) {
            totalReservations += 1;
            partySizeSum += reservation.getPartySize();
            if (reservation.getStatus() != ReservationStatus.CANCELLED) {
                totalCovers += reservation.getPartySize();
            }

            statusCounts.merge(reservation.getStatus(), 1, Integer::sum);

            LocalDate localDate = reservation.getStartAtUtc().atZone(timezone).toLocalDate();
            MutableDaily day = byDay.computeIfAbsent(localDate, ignored -> new MutableDaily());
            day.reservations += 1;
            if (reservation.getStatus() != ReservationStatus.CANCELLED) {
                day.covers += reservation.getPartySize();
            }
            if (reservation.getStatus() == ReservationStatus.NO_SHOW) {
                day.noShows += 1;
            }
            if (reservation.getStatus() == ReservationStatus.CANCELLED) {
                day.cancellations += 1;
            }

            String shiftName = reservation.getShift() != null ? reservation.getShift().getName() : "Unassigned";
            MutableShift shift = byShift.computeIfAbsent(shiftName, ignored -> new MutableShift());
            shift.reservations += 1;
            if (reservation.getStatus() != ReservationStatus.CANCELLED) {
                shift.covers += reservation.getPartySize();
            }
            if (reservation.getStatus() == ReservationStatus.NO_SHOW) {
                shift.noShows += 1;
            }
            if (reservation.getStatus() == ReservationStatus.CANCELLED) {
                shift.cancellations += 1;
            }
        }

        List<ReportDailyRow> dailyRows = new ArrayList<>();
        LocalDate cursor = startDate;
        while (!cursor.isAfter(endDate)) {
            MutableDaily row = byDay.getOrDefault(cursor, new MutableDaily());
            dailyRows.add(new ReportDailyRow(cursor, row.reservations, row.covers, row.noShows, row.cancellations));
            cursor = cursor.plusDays(1);
        }

        List<ReportShiftRow> shiftRows = byShift.entrySet().stream()
                .map(entry -> new ReportShiftRow(
                        entry.getKey(),
                        entry.getValue().reservations,
                        entry.getValue().covers,
                        entry.getValue().noShows,
                        entry.getValue().cancellations
                ))
                .sorted(Comparator.comparing(ReportShiftRow::shiftName))
                .toList();

        int noShows = statusCounts.getOrDefault(ReservationStatus.NO_SHOW, 0);
        int cancellations = statusCounts.getOrDefault(ReservationStatus.CANCELLED, 0);
        double averagePartySize = totalReservations > 0 ? (double) partySizeSum / totalReservations : 0;
        double noShowRate = totalReservations > 0 ? (double) noShows * 100 / totalReservations : 0;
        double cancellationRate = totalReservations > 0 ? (double) cancellations * 100 / totalReservations : 0;

        ReportTotals totals = new ReportTotals(
                totalReservations,
                totalCovers,
                round1(averagePartySize),
                round1(noShowRate),
                round1(cancellationRate)
        );

        Map<String, Integer> statusBreakdown = new HashMap<>();
        for (ReservationStatus status : ReservationStatus.values()) {
            statusBreakdown.put(status.name(), statusCounts.getOrDefault(status, 0));
        }

        return new ReportSummaryResponse(
                restaurantId,
                restaurant.getName(),
                restaurant.getTimezone(),
                startDate,
                endDate,
                timeService.now(),
                totals,
                statusBreakdown,
                dailyRows,
                shiftRows
        );
    }

    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'MANAGER')")
    public String exportCsv(Long restaurantId, LocalDate startDate, LocalDate endDate) {
        ReportSummaryResponse summary = getSummary(restaurantId, startDate, endDate);
        StringBuilder csv = new StringBuilder();
        csv.append("restaurant_id,restaurant_name,timezone,start_date,end_date,total_reservations,total_covers,avg_party_size,no_show_rate,cancellation_rate\n");
        csv.append(summary.restaurantId()).append(",")
                .append(escape(summary.restaurantName())).append(",")
                .append(escape(summary.timezone())).append(",")
                .append(summary.startDate()).append(",")
                .append(summary.endDate()).append(",")
                .append(summary.totals().totalReservations()).append(",")
                .append(summary.totals().totalCovers()).append(",")
                .append(summary.totals().averagePartySize()).append(",")
                .append(summary.totals().noShowRatePercent()).append(",")
                .append(summary.totals().cancellationRatePercent()).append("\n\n");

        csv.append("daily_date,reservations,covers,no_shows,cancellations\n");
        for (ReportDailyRow row : summary.dailyBreakdown()) {
            csv.append(row.date()).append(",")
                    .append(row.reservations()).append(",")
                    .append(row.covers()).append(",")
                    .append(row.noShows()).append(",")
                    .append(row.cancellations()).append("\n");
        }

        csv.append("\nshift_name,reservations,covers,no_shows,cancellations\n");
        for (ReportShiftRow row : summary.shiftBreakdown()) {
            csv.append(escape(row.shiftName())).append(",")
                    .append(row.reservations()).append(",")
                    .append(row.covers()).append(",")
                    .append(row.noShows()).append(",")
                    .append(row.cancellations()).append("\n");
        }

        return csv.toString();
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String escape(String input) {
        if (input == null) {
            return "";
        }
        if (input.contains(",") || input.contains("\"") || input.contains("\n")) {
            return "\"" + input.replace("\"", "\"\"") + "\"";
        }
        return input;
    }

    private static final class MutableDaily {
        int reservations;
        int covers;
        int noShows;
        int cancellations;
    }

    private static final class MutableShift {
        int reservations;
        int covers;
        int noShows;
        int cancellations;
    }
}
