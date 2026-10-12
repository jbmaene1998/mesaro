package com.mesaro.dashboard;

import com.mesaro.infra.TimeService;
import com.mesaro.reservation.Reservation;
import com.mesaro.reservation.ReservationStatus;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.restaurant.RestaurantStatus;
import com.mesaro.shift.Shift;
import com.mesaro.shift.ShiftService;
import com.mesaro.table.DiningTableRepository;
import com.mesaro.table.DiningTable;
import com.mesaro.table.TableStatus;
import org.springframework.stereotype.Service;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.WeekFields;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

/**
 * Service for dashboard data aggregation.
 * All methods are read-only and optimized for performance.
 */
@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final int UPCOMING_LIMIT_HOURS = 4;
    private static final int ARRIVING_SOON_WINDOW_MINUTES = 30;
    private static final List<ReservationStatus> ACTIVE_STATUSES = List.of(
            ReservationStatus.CONFIRMED, ReservationStatus.SEATED);

    private final DashboardRepository dashboardRepository;
    private final RestaurantService restaurantService;
    private final ShiftService shiftService;
    private final TimeService timeService;
    private final DiningTableRepository diningTableRepository;

    public DashboardService(
            DashboardRepository dashboardRepository,
            RestaurantService restaurantService,
            ShiftService shiftService,
            TimeService timeService,
            DiningTableRepository diningTableRepository) {
        this.dashboardRepository = dashboardRepository;
        this.restaurantService = restaurantService;
        this.shiftService = shiftService;
        this.timeService = timeService;
        this.diningTableRepository = diningTableRepository;
    }

    /**
     * Get complete dashboard data for a restaurant.
     */
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public DashboardResponse getDashboard(Long restaurantId) {
        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());
        LocalDate today = timeService.today(timezone);

        return getDashboard(restaurantId, today);
    }

    /**
     * Get dashboard data for a specific date.
     */
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public DashboardResponse getDashboard(Long restaurantId, LocalDate date) {
        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        Instant dayStart = date.atStartOfDay(timezone).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(timezone).toInstant();
        Instant now = timeService.now();
        LocalTime currentTime = timeService.toLocalTime(now, timezone);

        // Get daily stats
        DailyStats stats = calculateDailyStats(restaurantId, date, dayStart, dayEnd);

        // Get shift statuses
        int dayOfWeek = date.getDayOfWeek().getValue();
        List<Shift> shifts = activeShiftsForMoment(restaurantId, dayOfWeek);
        List<ShiftStatus> shiftStatuses = shifts.stream()
                .map(shift -> calculateShiftStatus(shift, dayStart, dayEnd, currentTime, dayOfWeek))
                .toList();

        // Find current shift
        ShiftStatus currentShift = shiftStatuses.stream()
                .filter(ShiftStatus::isActive)
                .findFirst()
                .orElse(null);

        // Get upcoming reservations
        Instant upcomingStart = now.isBefore(dayStart) ? dayStart : now;
        Instant upcomingEnd = dayEnd;
        List<UpcomingReservation> upcoming = getUpcomingReservations(
                restaurantId, upcomingStart, upcomingEnd, timezone);

        return new DashboardResponse(
                restaurantId,
                restaurant.getName(),
                restaurant.getTimezone(),
                date,
                stats,
                currentShift,
                shiftStatuses,
                upcoming,
                now
        );
    }

    /**
     * Get daily statistics.
     */
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public DailyStats getDailyStats(Long restaurantId, LocalDate date) {
        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        Instant dayStart = date.atStartOfDay(timezone).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(timezone).toInstant();

        return calculateDailyStats(restaurantId, date, dayStart, dayEnd);
    }

    /**
     * Get daily statistics for today in restaurant timezone.
     */
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public DailyStats getDailyStats(Long restaurantId) {
        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());
        LocalDate today = timeService.today(timezone);
        return getDailyStats(restaurantId, today);
    }

    /**
     * Get weekly statistics (ISO week).
     */
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public WeeklyStatsResponse getWeeklyStats(Long restaurantId, LocalDate date) {
        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        LocalDate anchor = date != null ? date : timeService.today(timezone);
        LocalDate weekStart = anchor.with(WeekFields.ISO.dayOfWeek(), 1);
        LocalDate weekEnd = weekStart.plusDays(6);

        List<DailyStats> days = IntStream.rangeClosed(0, 6)
                .mapToObj(offset -> {
                    LocalDate day = weekStart.plusDays(offset);
                    Instant dayStart = day.atStartOfDay(timezone).toInstant();
                    Instant dayEnd = day.plusDays(1).atStartOfDay(timezone).toInstant();
                    return calculateDailyStats(restaurantId, day, dayStart, dayEnd);
                })
                .toList();

        return new WeeklyStatsResponse(restaurantId, restaurant.getTimezone(), weekStart, weekEnd, days);
    }

    /**
     * Get monthly statistics for the month containing the given date.
     */
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public MonthlyStatsResponse getMonthlyStats(Long restaurantId, LocalDate date) {
        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        LocalDate anchor = date != null ? date : timeService.today(timezone);
        LocalDate monthStart = anchor.withDayOfMonth(1);
        LocalDate monthEnd = anchor.withDayOfMonth(anchor.lengthOfMonth());

        List<DailyStats> days = IntStream.rangeClosed(0, monthEnd.getDayOfMonth() - 1)
                .mapToObj(offset -> {
                    LocalDate day = monthStart.plusDays(offset);
                    Instant dayStart = day.atStartOfDay(timezone).toInstant();
                    Instant dayEnd = day.plusDays(1).atStartOfDay(timezone).toInstant();
                    return calculateDailyStats(restaurantId, day, dayStart, dayEnd);
                })
                .toList();

        return new MonthlyStatsResponse(restaurantId, restaurant.getTimezone(), monthStart, monthEnd, days);
    }

    /**
     * Get timeline data for a specific date.
     */
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public TimelineResponse getTimeline(Long restaurantId, LocalDate date) {
        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());
        LocalDate targetDate = date != null ? date : timeService.today(timezone);

        Instant dayStart = targetDate.atStartOfDay(timezone).toInstant();
        Instant dayEnd = targetDate.plusDays(1).atStartOfDay(timezone).toInstant();

        List<DiningTable> tables = diningTableRepository.findByRestaurantIdOrderByLabel(restaurantId);
        List<TimelineTable> tableSummaries = tables.stream()
                .map(TimelineTable::from)
                .toList();

        List<Reservation> reservations = dashboardRepository.findAllForDayWithTables(
                restaurantId, dayStart, dayEnd);
        List<TimelineReservation> timelineReservations = reservations.stream()
                .map(reservation -> TimelineReservation.from(reservation, timezone))
                .toList();

        return new TimelineResponse(
                restaurantId,
                restaurant.getName(),
                restaurant.getTimezone(),
                targetDate,
                tableSummaries,
                timelineReservations
        );
    }

    /**
     * Get current shift status.
     */
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public ShiftStatus getCurrentShiftStatus(Long restaurantId) {
        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());
        LocalDate today = timeService.today(timezone);
        LocalTime currentTime = timeService.toLocalTime(timeService.now(), timezone);

        Instant dayStart = today.atStartOfDay(timezone).toInstant();
        Instant dayEnd = today.plusDays(1).atStartOfDay(timezone).toInstant();

        int dayOfWeek = today.getDayOfWeek().getValue();
        List<Shift> shifts = activeShiftsForMoment(restaurantId, dayOfWeek);

        return shifts.stream()
                .filter(s -> isShiftActive(s, currentTime, dayOfWeek))
                .findFirst()
                .map(shift -> calculateShiftStatus(shift, dayStart, dayEnd, currentTime, dayOfWeek))
                .orElse(null);
    }

    /**
     * Get upcoming reservations (next N hours).
     */
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public List<UpcomingReservation> getUpcomingReservations(Long restaurantId) {
        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        Instant now = timeService.now();
        Instant upcomingEnd = now.plusSeconds(UPCOMING_LIMIT_HOURS * 3600L);

        return getUpcomingReservations(restaurantId, now, upcomingEnd, timezone);
    }

    public PortfolioDashboardResponse getPortfolioDashboard(Long userId, LocalDate date) {
        List<Restaurant> restaurants = restaurantService.findByUserId(userId).stream()
                .filter(restaurant -> restaurant.getStatus() == RestaurantStatus.ACTIVE)
                .toList();
        Instant generatedAt = timeService.now();

        List<PortfolioRestaurantSummary> restaurantSummaries = restaurants.stream()
                .map(restaurant -> toPortfolioRestaurantSummary(restaurant, date))
                .toList();

        int totalReservations = restaurantSummaries.stream().mapToInt(PortfolioRestaurantSummary::totalReservations).sum();
        int totalCovers = restaurantSummaries.stream().mapToInt(PortfolioRestaurantSummary::totalCovers).sum();
        int totalNoShows = restaurantSummaries.stream().mapToInt(PortfolioRestaurantSummary::noShowCount).sum();

        PortfolioTotals totals = new PortfolioTotals(
                restaurantSummaries.size(),
                totalReservations,
                totalCovers,
                totalNoShows
        );

        return new PortfolioDashboardResponse(generatedAt, restaurantSummaries, totals);
    }

    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public LiveServiceViewResponse getLiveServiceView(Long restaurantId) {
        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());
        LocalDate today = timeService.today(timezone);
        Instant dayStart = today.atStartOfDay(timezone).toInstant();
        Instant dayEnd = today.plusDays(1).atStartOfDay(timezone).toInstant();
        Instant now = timeService.now();

        List<DiningTable> tables = diningTableRepository.findByRestaurantIdOrderByLabel(restaurantId);
        List<Reservation> reservations = dashboardRepository.findLiveServiceReservations(restaurantId, dayStart, dayEnd);

        Map<Long, List<Reservation>> reservationsByTable = new HashMap<>();
        for (Reservation reservation : reservations) {
            reservation.getTables().forEach(table ->
                    reservationsByTable.computeIfAbsent(table.getId(), ignored -> new java.util.ArrayList<>()).add(reservation));
        }

        List<LiveServiceTableStatus> tableStatuses = tables.stream()
                .map(table -> toLiveTableStatus(table, reservationsByTable.getOrDefault(table.getId(), List.of()), now, timezone))
                .toList();

        return new LiveServiceViewResponse(
                restaurantId,
                restaurant.getName(),
                restaurant.getTimezone(),
                now,
                tableStatuses
        );
    }

    private LiveServiceTableStatus toLiveTableStatus(DiningTable table, List<Reservation> tableReservations, Instant now, ZoneId timezone) {
        if (table.getStatus() == TableStatus.UNAVAILABLE) {
            return new LiveServiceTableStatus(
                    table.getId(),
                    table.getLabel(),
                    table.getSeats(),
                    LiveServiceStatus.UNAVAILABLE,
                    null,
                    null,
                    null,
                    null,
                    null
            );
        }

        Reservation activeSeated = tableReservations.stream()
                .filter(r -> r.getStatus() == ReservationStatus.SEATED)
                .min(Comparator.comparing(Reservation::getStartAtUtc))
                .orElse(null);

        if (activeSeated != null) {
            int turnMinutes = (int) ChronoUnit.MINUTES.between(activeSeated.getStartAtUtc(), now);
            int expectedTurnMinutes = (int) ChronoUnit.MINUTES.between(activeSeated.getStartAtUtc(), activeSeated.getEndAtUtc());
            int overstayMinutes = Math.max(0, (int) ChronoUnit.MINUTES.between(activeSeated.getEndAtUtc(), now));
            return new LiveServiceTableStatus(
                    table.getId(),
                    table.getLabel(),
                    table.getSeats(),
                    LiveServiceStatus.OCCUPIED,
                    LiveServiceReservation.from(activeSeated, timezone),
                    findNextConfirmed(tableReservations, now, timezone),
                    Math.max(turnMinutes, 0),
                    Math.max(expectedTurnMinutes, 0),
                    overstayMinutes
            );
        }

        Reservation arrivingSoon = tableReservations.stream()
                .filter(r -> r.getStatus() == ReservationStatus.CONFIRMED)
                .filter(r -> !r.getStartAtUtc().isAfter(now.plus(ARRIVING_SOON_WINDOW_MINUTES, ChronoUnit.MINUTES)))
                .filter(r -> r.getEndAtUtc().isAfter(now))
                .min(Comparator.comparing(Reservation::getStartAtUtc))
                .orElse(null);

        if (arrivingSoon != null) {
            return new LiveServiceTableStatus(
                    table.getId(),
                    table.getLabel(),
                    table.getSeats(),
                    LiveServiceStatus.ARRIVING_SOON,
                    null,
                    LiveServiceReservation.from(arrivingSoon, timezone),
                    null,
                    null,
                    null
            );
        }

        LiveServiceReservation nextReservation = findNextConfirmed(tableReservations, now, timezone);
        if (nextReservation != null) {
            return new LiveServiceTableStatus(
                    table.getId(),
                    table.getLabel(),
                    table.getSeats(),
                    LiveServiceStatus.RESERVED_LATER,
                    null,
                    nextReservation,
                    null,
                    null,
                    null
            );
        }

        return new LiveServiceTableStatus(
                table.getId(),
                table.getLabel(),
                table.getSeats(),
                LiveServiceStatus.AVAILABLE,
                null,
                null,
                null,
                null,
                null
        );
    }

    private LiveServiceReservation findNextConfirmed(List<Reservation> tableReservations, Instant now, ZoneId timezone) {
        Reservation next = tableReservations.stream()
                .filter(r -> r.getStatus() == ReservationStatus.CONFIRMED)
                .filter(r -> !r.getEndAtUtc().isBefore(now))
                .min(Comparator.comparing(Reservation::getStartAtUtc))
                .orElse(null);
        return next != null ? LiveServiceReservation.from(next, timezone) : null;
    }

    private DailyStats calculateDailyStats(Long restaurantId, LocalDate date,
                                            Instant dayStart, Instant dayEnd) {
        // Get counts by status
        List<Object[]> countsByStatus = dashboardRepository.countByStatusForDateRange(
                restaurantId, dayStart, dayEnd);

        // Get covers by status
        List<Object[]> coversByStatus = dashboardRepository.sumCoversByStatusForDateRange(
                restaurantId, dayStart, dayEnd);

        // Build status map
        Map<String, Integer> byStatus = new HashMap<>();
        int totalReservations = 0;
        int confirmedCount = 0, seatedCount = 0, completedCount = 0, noShowCount = 0, cancelledCount = 0;

        for (Object[] row : countsByStatus) {
            ReservationStatus status = (ReservationStatus) row[0];
            int count = ((Number) row[1]).intValue();
            byStatus.put(status.name(), count);
            totalReservations += count;

            switch (status) {
                case CONFIRMED -> confirmedCount = count;
                case SEATED -> seatedCount = count;
                case COMPLETED -> completedCount = count;
                case NO_SHOW -> noShowCount = count;
                case CANCELLED -> cancelledCount = count;
            }
        }

        // Calculate total covers (only count active/completed)
        int totalCovers = 0;
        for (Object[] row : coversByStatus) {
            ReservationStatus status = (ReservationStatus) row[0];
            int covers = ((Number) row[1]).intValue();
            if (status != ReservationStatus.CANCELLED) {
                totalCovers += covers;
            }
        }

        return new DailyStats(
                date,
                totalReservations,
                totalCovers,
                byStatus,
                confirmedCount,
                seatedCount,
                completedCount,
                noShowCount,
                cancelledCount
        );
    }

    private PortfolioRestaurantSummary toPortfolioRestaurantSummary(Restaurant restaurant, LocalDate date) {
        Long restaurantId = restaurant.getId();
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());
        LocalDate effectiveDate = date != null ? date : timeService.today(timezone);
        Instant dayStart = effectiveDate.atStartOfDay(timezone).toInstant();
        Instant dayEnd = effectiveDate.plusDays(1).atStartOfDay(timezone).toInstant();
        LocalTime currentTime = timeService.toLocalTime(timeService.now(), timezone);
        int dayOfWeek = effectiveDate.getDayOfWeek().getValue();

        DailyStats stats = calculateDailyStats(restaurantId, effectiveDate, dayStart, dayEnd);
        ShiftStatus currentShift = activeShiftsForMoment(restaurantId, dayOfWeek).stream()
                .filter(shift -> isShiftActive(shift, currentTime, dayOfWeek))
                .findFirst()
                .map(shift -> calculateShiftStatus(shift, dayStart, dayEnd, currentTime, dayOfWeek))
                .orElse(null);

        return new PortfolioRestaurantSummary(
                restaurantId,
                restaurant.getName(),
                restaurant.getTimezone(),
                effectiveDate,
                stats.totalReservations(),
                stats.totalCovers(),
                stats.noShowCount(),
                currentShift != null ? currentShift.shiftName() : null,
                currentShift != null ? currentShift.currentCovers() : null,
                currentShift != null ? currentShift.maxCovers() : null
        );
    }

    private ShiftStatus calculateShiftStatus(Shift shift, Instant dayStart, Instant dayEnd,
                                             LocalTime currentTime, int currentDayOfWeek) {
        int currentCovers = dashboardRepository.countCoversForShift(shift.getId(), dayStart, dayEnd);
        int reservationCount = dashboardRepository.countReservationsForShift(shift.getId(), dayStart, dayEnd);
        boolean isActive = isShiftActive(shift, currentTime, currentDayOfWeek);

        return ShiftStatus.from(
                shift.getId(),
                shift.getName(),
                shift.getStartTime(),
                shift.getEndTime(),
                shift.getMaxCovers(),
                currentCovers,
                reservationCount,
                isActive
        );
    }

    private boolean isShiftActive(Shift shift, LocalTime currentTime, int currentDayOfWeek) {
        if (!shift.isOvernight()) {
            return shift.getDayOfWeek() == currentDayOfWeek &&
                    !currentTime.isBefore(shift.getStartTime()) &&
                    currentTime.isBefore(shift.getEndTime());
        }

        int previousDay = currentDayOfWeek == 1 ? 7 : currentDayOfWeek - 1;
        if (shift.getDayOfWeek() == currentDayOfWeek) {
            return !currentTime.isBefore(shift.getStartTime());
        }
        if (shift.getDayOfWeek() == previousDay) {
            return currentTime.isBefore(shift.getEndTime());
        }
        return false;
    }

    private List<Shift> activeShiftsForMoment(Long restaurantId, int dayOfWeek) {
        int previousDay = dayOfWeek == 1 ? 7 : dayOfWeek - 1;
        List<Shift> shifts = new java.util.ArrayList<>(shiftService.findActiveByRestaurantAndDay(restaurantId, dayOfWeek));
        shifts.addAll(
                shiftService.findActiveByRestaurantAndDay(restaurantId, previousDay).stream()
                        .filter(Shift::isOvernight)
                        .toList()
        );
        return shifts;
    }

    private List<UpcomingReservation> getUpcomingReservations(Long restaurantId, Instant fromUtc,
                                                               Instant toUtc, ZoneId timezone) {
        List<Reservation> reservations = dashboardRepository.findUpcomingWithTables(
                restaurantId, ACTIVE_STATUSES, fromUtc, toUtc);

        return reservations.stream()
                .map(r -> UpcomingReservation.from(r, timezone))
                .toList();
    }
}
