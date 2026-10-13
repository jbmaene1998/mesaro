package com.mesaro.availability;

import com.mesaro.common.exception.ValidationException;
import com.mesaro.infra.TimeService;
import com.mesaro.restaurant.AssignmentMode;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.shift.Shift;
import com.mesaro.shift.ShiftService;
import com.mesaro.vacation.VacationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class AvailabilityService {

    private static final Logger log = LoggerFactory.getLogger(AvailabilityService.class);

    private final RestaurantService restaurantService;
    private final ShiftService shiftService;
    private final VacationService vacationService;
    private final TableSelectionService tableSelectionService;
    private final OverlapCheckRepository overlapCheckRepository;
    private final TimeService timeService;

    public AvailabilityService(
            RestaurantService restaurantService,
            ShiftService shiftService,
            VacationService vacationService,
            TableSelectionService tableSelectionService,
            OverlapCheckRepository overlapCheckRepository,
            TimeService timeService) {
        this.restaurantService = restaurantService;
        this.shiftService = shiftService;
        this.vacationService = vacationService;
        this.tableSelectionService = tableSelectionService;
        this.overlapCheckRepository = overlapCheckRepository;
        this.timeService = timeService;
    }

    public AvailabilityResponse checkAvailability(AvailabilityRequest request) {
        Restaurant restaurant = restaurantService.findBySlug(request.restaurantSlug());
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());
        LocalDate today = timeService.today(timezone);

        // Validate request
        validateRequest(request, today, restaurant);

        // Step 1: Check if booking is enabled
        if (!restaurant.isBookingEnabled()) {
            log.debug("Booking disabled for restaurant {}", request.restaurantSlug());
            return AvailabilityResponse.closed(
                    restaurant.getSlug(),
                    restaurant.getName(),
                    restaurant.getTimezone(),
                    restaurant.getLocale(),
                    request.date(),
                    request.partySize(),
                    restaurant.getMinNoticeMinutes(),
                    restaurant.getMaxAdvanceDays(),
                    restaurant.getMaxPartySize(),
                    "Booking is currently disabled"
            );
        }

        // Step 2: Check for restaurant closure
        if (vacationService.isRestaurantClosed(restaurant.getId(), request.date())) {
            log.debug("Restaurant {} is closed on {}", request.restaurantSlug(), request.date());
            return AvailabilityResponse.closed(
                    restaurant.getSlug(),
                    restaurant.getName(),
                    restaurant.getTimezone(),
                    restaurant.getLocale(),
                    request.date(),
                    request.partySize(),
                    restaurant.getMinNoticeMinutes(),
                    restaurant.getMaxAdvanceDays(),
                    restaurant.getMaxPartySize(),
                    "Restaurant is closed on this date"
            );
        }

        // Step 3: Load active shifts for the day plus overnight carry-over from previous day
        DayOfWeek dayOfWeek = request.date().getDayOfWeek();
        int dayValue = dayOfWeek.getValue();
        int previousDay = dayValue == 1 ? 7 : dayValue - 1;
        List<Shift> shifts = new ArrayList<>(shiftService.findActiveByRestaurantAndDay(restaurant.getId(), dayValue));
        shifts.addAll(
                shiftService.findActiveByRestaurantAndDay(restaurant.getId(), previousDay).stream()
                        .filter(Shift::isOvernight)
                        .toList()
        );

        if (shifts.isEmpty()) {
            log.debug("No active shifts for restaurant {} on {}", request.restaurantSlug(), dayOfWeek);
            return AvailabilityResponse.closed(
                    restaurant.getSlug(),
                    restaurant.getName(),
                    restaurant.getTimezone(),
                    restaurant.getLocale(),
                    request.date(),
                    request.partySize(),
                    restaurant.getMinNoticeMinutes(),
                    restaurant.getMaxAdvanceDays(),
                    restaurant.getMaxPartySize(),
                    "No service available on this day"
            );
        }

        // Step 4: Generate slots for each shift
        List<TimeSlot> allSlots = new ArrayList<>();
        Instant now = timeService.now();
        Instant dayStartUtc = timeService.toUtc(request.date(), LocalTime.MIDNIGHT, timezone);
        Instant dayEndUtc = timeService.toUtc(request.date().plusDays(1), LocalTime.MIDNIGHT, timezone);

        for (Shift shift : shifts) {
            int[] shiftWindow = shiftWindowForDate(dayValue, shift);
            if (shiftWindow == null) {
                continue;
            }

            int slotStart = shiftWindow[0];
            int slotEnd = shiftWindow[1];
            if (slotStart >= slotEnd) {
                continue;
            }

            int currentCovers = overlapCheckRepository.countCoversForShift(
                    shift.getId(), dayStartUtc, dayEndUtc);
            int remainingCapacity = shift.getMaxCovers() - currentCovers;
            boolean shiftCapacityExceeded = request.partySize() > remainingCapacity;

            List<TimeSlot> shiftSlots = generateSlotsForShift(
                    shift, request.date(), timezone, now, request.partySize(),
                    slotStart, slotEnd, dayValue, shiftCapacityExceeded, restaurant);
            allSlots.addAll(shiftSlots);
        }

        // Sort by time
        allSlots.sort(Comparator.comparing(TimeSlot::time));

        log.debug("Generated {} slots for restaurant {} on {}",
                allSlots.size(), request.restaurantSlug(), request.date());

        return AvailabilityResponse.open(
                restaurant.getSlug(),
                restaurant.getName(),
                restaurant.getTimezone(),
                restaurant.getLocale(),
                request.date(),
                request.partySize(),
                restaurant.getMinNoticeMinutes(),
                restaurant.getMaxAdvanceDays(),
                restaurant.getMaxPartySize(),
                allSlots
        );
    }

    public boolean isRestaurantClosed(String restaurantSlug, LocalDate date) {
        Restaurant restaurant = restaurantService.findBySlug(restaurantSlug);

        if (!restaurant.isBookingEnabled()) {
            return true;
        }

        if (vacationService.isRestaurantClosed(restaurant.getId(), date)) {
            return true;
        }

        return !hasActiveServiceOnDate(restaurant.getId(), date);
    }

    public String getClosedReason(String restaurantSlug, LocalDate date) {
        Restaurant restaurant = restaurantService.findBySlug(restaurantSlug);
        if (!restaurant.isBookingEnabled()) {
            return "Booking is currently disabled";
        }

        String vacationReason = vacationService.getClosureReason(restaurant.getId(), date);
        if (vacationReason != null) {
            return vacationReason;
        }

        if (!hasActiveServiceOnDate(restaurant.getId(), date)) {
            return "No service available on this day";
        }

        return null;
    }

    private boolean hasActiveServiceOnDate(Long restaurantId, LocalDate date) {
        int dayValue = date.getDayOfWeek().getValue();
        int previousDay = dayValue == 1 ? 7 : dayValue - 1;
        if (!shiftService.findActiveByRestaurantAndDay(restaurantId, dayValue).isEmpty()) {
            return true;
        }
        return shiftService.findActiveByRestaurantAndDay(restaurantId, previousDay).stream()
                .anyMatch(Shift::isOvernight);
    }

    private void validateRequest(AvailabilityRequest request, LocalDate today, Restaurant restaurant) {
        if (request.date().isBefore(today)) {
            throw new ValidationException("Cannot check availability for past dates", "date");
        }

        if (request.date().isAfter(today.plusDays(restaurant.getMaxAdvanceDays()))) {
            throw new ValidationException(
                    "Cannot check availability more than " + restaurant.getMaxAdvanceDays() + " days in advance", "date");
        }

        if (request.partySize() > restaurant.getMaxPartySize()) {
            throw new ValidationException(
                    "Party size must not exceed " + restaurant.getMaxPartySize(), "partySize");
        }
    }

    private List<TimeSlot> generateSlotsForShift(Shift shift, LocalDate date, ZoneId timezone,
                                                   Instant now, int partySize,
                                                   int slotStartMinute, int slotEndMinute, int requestedDayOfWeek,
                                                   boolean shiftCapacityExceeded, Restaurant restaurant) {
        List<TimeSlot> slots = new ArrayList<>();

        int durationMinutes = restaurant.getDefaultDurationMinutes();
        if (durationMinutes <= 0) {
            return slots;
        }

        int latestStartMinute = slotEndMinute - durationMinutes;
        if (latestStartMinute < slotStartMinute) {
            return slots;
        }

        int slotMinutes = shift.getSlotDurationMinutes();
        int currentMinute = slotStartMinute;

        while (currentMinute <= latestStartMinute) {
            LocalTime currentTime = minuteToLocalTime(currentMinute);
            if (!shift.isReservableAt(requestedDayOfWeek, currentTime)) {
                currentMinute += slotMinutes;
                if (slotMinutes <= 0) {
                    break;
                }
                continue;
            }

            TimeSlot slot = createSlot(shift, date, currentTime, timezone, now, partySize,
                    shiftCapacityExceeded, restaurant);
            if (slot != null) {
                slots.add(slot);
            }

            currentMinute += slotMinutes;

            // Prevent infinite loop if slot duration is 0 (shouldn't happen, but safety check)
            if (slotMinutes <= 0) {
                break;
            }
        }

        return slots;
    }

    private TimeSlot createSlot(Shift shift, LocalDate date, LocalTime time,
                                 ZoneId timezone, Instant now, int partySize,
                                 boolean shiftCapacityExceeded, Restaurant restaurant) {
        // Step 6: Validate DST
        DstResult dstResult = timeService.validateAndConvertToUtc(date, time, timezone);

        return switch (dstResult) {
            case DstResult.Gap gap -> {
                // Skip non-existent times due to DST
                log.trace("Skipping DST gap time: {} on {}", time, date);
                yield null;
            }
            case DstResult.Overlap overlap -> {
                // Use ambiguous times with earlier offset (logged in TimeService)
                yield createSlotWithAvailability(shift, time, overlap.utcInstant(), now, partySize,
                        shiftCapacityExceeded, restaurant);
            }
            case DstResult.Valid valid -> {
                yield createSlotWithAvailability(shift, time, valid.utcInstant(), now, partySize,
                        shiftCapacityExceeded, restaurant);
            }
        };
    }

    private TimeSlot createSlotWithAvailability(Shift shift, LocalTime time, Instant utcTime,
                                                  Instant now, int partySize,
                                                  boolean shiftCapacityExceeded, Restaurant restaurant) {
        // Check if slot is in the past
        if (utcTime.isBefore(now)) {
            return TimeSlot.unavailable(time, utcTime, shift.getId(), shift.getName(), "Time has passed");
        }

        if (restaurant.getMinNoticeMinutes() > 0 &&
                utcTime.isBefore(now.plus(restaurant.getMinNoticeMinutes(), ChronoUnit.MINUTES))) {
            return TimeSlot.unavailable(
                    time, utcTime, shift.getId(), shift.getName(),
                    "Minimum notice is " + restaurant.getMinNoticeMinutes() + " minutes"
            );
        }

        if (shiftCapacityExceeded) {
            return TimeSlot.unavailable(time, utcTime, shift.getId(), shift.getName(), "Shift capacity reached");
        }

        Instant endUtc = utcTime.plus(restaurant.getDefaultDurationMinutes(), ChronoUnit.MINUTES);

        if (restaurant.getAssignmentMode() == AssignmentMode.AUTO) {
            TableSelectionResult selection = tableSelectionService.findBestMatch(
                    restaurant, partySize, utcTime, endUtc);
            if (!selection.isMatch()) {
                String reason = switch (selection) {
                    case TableSelectionResult.NoMatch noMatch -> noMatch.reason();
                    default -> "No available table";
                };
                return TimeSlot.unavailable(time, utcTime, shift.getId(), shift.getName(), reason);
            }
        }

        return TimeSlot.available(time, utcTime, shift.getId(), shift.getName());
    }

    private int[] shiftWindowForDate(int requestedDayOfWeek, Shift shift) {
        int shiftDay = shift.getDayOfWeek();
        int previousDay = requestedDayOfWeek == 1 ? 7 : requestedDayOfWeek - 1;

        if (!shift.isOvernight()) {
            if (shiftDay != requestedDayOfWeek) {
                return null;
            }
            return new int[]{minuteOfDay(shift.getStartTime()), minuteOfDay(shift.getEndTime())};
        }

        if (shiftDay == requestedDayOfWeek) {
            return new int[]{minuteOfDay(shift.getStartTime()), 24 * 60};
        }

        if (shiftDay == previousDay) {
            return new int[]{0, minuteOfDay(shift.getEndTime())};
        }

        return null;
    }

    private int minuteOfDay(LocalTime time) {
        return time.getHour() * 60 + time.getMinute();
    }

    private LocalTime minuteToLocalTime(int minute) {
        int value = Math.floorMod(minute, 24 * 60);
        return LocalTime.of(value / 60, value % 60);
    }
}
