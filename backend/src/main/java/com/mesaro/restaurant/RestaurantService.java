package com.mesaro.restaurant;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.NotFoundException;
import com.mesaro.common.exception.RestaurantQuotaExceededException;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.hold.HoldRepository;
import com.mesaro.infra.TimeService;
import com.mesaro.planning.StaffShiftAssignmentRepository;
import com.mesaro.reservation.Reservation;
import com.mesaro.reservation.ReservationRepository;
import com.mesaro.reservation.ReservationStatus;
import com.mesaro.security.RestaurantRole;
import com.mesaro.openinghours.OpeningHours;
import com.mesaro.openinghours.OpeningHoursRepository;
import com.mesaro.shift.Shift;
import com.mesaro.shift.ShiftRepository;
import com.mesaro.shift.ShiftStatus;
import com.mesaro.staff.StaffInviteRepository;
import com.mesaro.table.DiningTableRepository;
import com.mesaro.table.TableCombinationRepository;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserRestaurant;
import com.mesaro.user.UserRestaurantRepository;
import com.mesaro.vacation.VacationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class RestaurantService {

    private static final Logger log = LoggerFactory.getLogger(RestaurantService.class);

    private final RestaurantRepository restaurantRepository;
    private final OpeningHoursRepository openingHoursRepository;
    private final UserAccountRepository userAccountRepository;
    private final UserRestaurantRepository userRestaurantRepository;
    private final ReservationRepository reservationRepository;
    private final HoldRepository holdRepository;
    private final VacationRepository vacationRepository;
    private final StaffInviteRepository staffInviteRepository;
    private final StaffShiftAssignmentRepository staffShiftAssignmentRepository;
    private final ShiftRepository shiftRepository;
    private final TableCombinationRepository tableCombinationRepository;
    private final DiningTableRepository diningTableRepository;
    private final TimeService timeService;
    private final AuditService auditService;

    public RestaurantService(RestaurantRepository restaurantRepository,
                             OpeningHoursRepository openingHoursRepository,
                             UserAccountRepository userAccountRepository,
                             UserRestaurantRepository userRestaurantRepository,
                             ReservationRepository reservationRepository,
                             HoldRepository holdRepository,
                             VacationRepository vacationRepository,
                             StaffInviteRepository staffInviteRepository,
                             StaffShiftAssignmentRepository staffShiftAssignmentRepository,
                             ShiftRepository shiftRepository,
                             TableCombinationRepository tableCombinationRepository,
                             DiningTableRepository diningTableRepository,
                             TimeService timeService,
                             AuditService auditService) {
        this.restaurantRepository = restaurantRepository;
        this.openingHoursRepository = openingHoursRepository;
        this.userAccountRepository = userAccountRepository;
        this.userRestaurantRepository = userRestaurantRepository;
        this.reservationRepository = reservationRepository;
        this.holdRepository = holdRepository;
        this.vacationRepository = vacationRepository;
        this.staffInviteRepository = staffInviteRepository;
        this.staffShiftAssignmentRepository = staffShiftAssignmentRepository;
        this.shiftRepository = shiftRepository;
        this.tableCombinationRepository = tableCombinationRepository;
        this.diningTableRepository = diningTableRepository;
        this.timeService = timeService;
        this.auditService = auditService;
    }

    public Restaurant findById(Long id) {
        return restaurantRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Restaurant", id));
    }

    public Restaurant findOperationalById(Long id) {
        Restaurant restaurant = findById(id);
        if (isArchivedOrDeleted(restaurant)) {
            throw new NotFoundException("Restaurant", id);
        }
        return restaurant;
    }

    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public Restaurant findByIdWithAccess(Long id) {
        return findOperationalById(id);
    }

    public Restaurant findBySlug(String slug) {
        Restaurant restaurant = restaurantRepository.findBySlug(slug)
                .orElseThrow(() -> new NotFoundException("Restaurant not found with slug: " + slug));
        if (restaurant.getStatus() == RestaurantStatus.ARCHIVED || restaurant.getStatus() == RestaurantStatus.DELETED) {
            throw new NotFoundException("Restaurant not found with slug: " + slug);
        }
        return restaurant;
    }

    public List<Restaurant> findAll() {
        return restaurantRepository.findAll();
    }

    public List<Restaurant> findByUserId(Long userId) {
        return userRestaurantRepository.findRestaurantsByUserId(userId);
    }

    public List<OpeningHours> findOpeningHours(Long restaurantId) {
        return openingHoursRepository.findByRestaurant_IdOrderByIdDayOfWeekAsc(restaurantId);
    }

    public Optional<OpeningHours> findOpeningHoursForDay(Long restaurantId, int dayOfWeek) {
        return openingHoursRepository.findByRestaurant_IdAndIdDayOfWeek(restaurantId, dayOfWeek);
    }

    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'STAFF')")
    public List<OpeningHours> findOpeningHoursWithAccess(Long restaurantId) {
        findByIdWithAccess(restaurantId);
        return openingHoursRepository.findByRestaurant_IdOrderByIdDayOfWeekAsc(restaurantId);
    }

    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#a0, 'OWNER')")
    public List<OpeningHours> updateOpeningHours(Long restaurantId, List<UpdateOpeningHoursDayRequest> days) {
        if (days == null || days.size() != 7) {
            throw new ValidationException("Opening hours must include exactly 7 days", "days");
        }

        Restaurant restaurant = findOperationalById(restaurantId);
        Map<Integer, UpdateOpeningHoursDayRequest> byDay = new HashMap<>();

        for (UpdateOpeningHoursDayRequest day : days) {
            if (byDay.putIfAbsent(day.dayOfWeek(), day) != null) {
                throw new ValidationException("Duplicate day of week in opening hours payload", "dayOfWeek");
            }

            boolean isOpen = Boolean.TRUE.equals(day.open());
            if (isOpen) {
                if (day.openLocalTime() == null || day.closeLocalTime() == null) {
                    throw new ValidationException("Open and close times are required when day is open", "openLocalTime");
                }
                if (!day.openLocalTime().isBefore(day.closeLocalTime())) {
                    throw new ValidationException("Open time must be before close time", "openLocalTime");
                }
            }
        }

        for (int day = 1; day <= 7; day++) {
            if (!byDay.containsKey(day)) {
                throw new ValidationException("Opening hours payload missing day: " + day, "dayOfWeek");
            }
        }

        Map<Integer, OpeningHours> existing = findOpeningHours(restaurantId).stream()
                .collect(java.util.stream.Collectors.toMap(OpeningHours::getDayOfWeek, value -> value));

        java.util.Set<Integer> newlyClosedDays = new java.util.HashSet<>();
        for (int day = 1; day <= 7; day++) {
            OpeningHours current = existing.get(day);
            boolean wasOpen = current != null
                    && current.getOpenLocalTime() != null
                    && current.getCloseLocalTime() != null;
            boolean willBeOpen = Boolean.TRUE.equals(byDay.get(day).open());
            if (wasOpen && !willBeOpen) {
                newlyClosedDays.add(day);
            }
        }

        long totalAffectedCount = 0L;
        if (!newlyClosedDays.isEmpty()) {
            for (int closedDay : newlyClosedDays) {
                List<Shift> activeShiftsOnDay = shiftRepository.findByRestaurantIdAndDayOfWeekAndStatus(
                        restaurantId, closedDay, ShiftStatus.ACTIVE);
                if (!activeShiftsOnDay.isEmpty()) {
                    String names = activeShiftsOnDay.stream().map(Shift::getName).collect(java.util.stream.Collectors.joining(", "));
                    log.warn("Opening hours for day {} set to CLOSED but active shift(s) exist: {}. Consider deactivating those shifts.",
                            closedDay, names);
                }
            }
            ZoneId timezone = ZoneId.of(restaurant.getTimezone());
            Instant now = timeService.now();
            Instant cutoff = now.plus(90, ChronoUnit.DAYS);
            List<Reservation> upcoming = reservationRepository.findByRestaurantAndDateRangeAndStatus(
                    restaurantId,
                    now,
                    cutoff,
                    List.of(ReservationStatus.CONFIRMED, ReservationStatus.SEATED)
            );
            totalAffectedCount = upcoming.stream()
                    .filter(reservation -> newlyClosedDays.contains(
                            reservation.getStartAtUtc().atZone(timezone).getDayOfWeek().getValue()))
                    .count();
            if (totalAffectedCount > 0) {
                log.warn("Opening hours update for restaurant {} affects {} upcoming reservation(s) on newly closed day(s)",
                        restaurantId, totalAffectedCount);
            }
        }

        List<OpeningHours> toSave = new java.util.ArrayList<>();
        for (int day = 1; day <= 7; day++) {
            UpdateOpeningHoursDayRequest input = byDay.get(day);
            OpeningHours openingHours = existing.get(day);
            if (openingHours == null) {
                openingHours = new OpeningHours(restaurant, day, null, null);
            }

            if (Boolean.TRUE.equals(input.open())) {
                openingHours.setOpenLocalTime(input.openLocalTime());
                openingHours.setCloseLocalTime(input.closeLocalTime());
            } else {
                openingHours.setOpenLocalTime(null);
                openingHours.setCloseLocalTime(null);
            }
            toSave.add(openingHours);
        }

        List<OpeningHours> saved = openingHoursRepository.saveAll(toSave);
        auditService.record(
                AuditEventType.OPENING_HOURS_UPDATED,
                restaurantId,
                null,
                restaurantId,
                "RESTAURANT",
                Map.of("affectedReservations", totalAffectedCount)
        );
        return saved.stream()
                .sorted(java.util.Comparator.comparing(OpeningHours::getDayOfWeek))
                .toList();
    }

    @Transactional
    public Restaurant create(CreateRestaurantRequest request) {
        validateTimezone(request.timezone());
        validateSlugUnique(request.slug());

        Restaurant restaurant = new Restaurant(
                request.name(),
                request.slug(),
                request.timezone()
        );
        restaurant.setLocale(normalizeLocale(request.locale()));
        restaurant.setSlotIntervalMinutes(request.slotIntervalMinutes());
        restaurant.setDefaultDurationMinutes(request.defaultDurationMinutes());
        restaurant.setMinNoticeMinutes(request.minNoticeMinutes());
        restaurant.setMaxAdvanceDays(request.maxAdvanceDays());
        restaurant.setMaxPartySize(request.maxPartySize());
        restaurant.setAssignmentMode(request.assignmentMode());

        Restaurant saved = restaurantRepository.save(restaurant);
        log.info("Created restaurant: {} ({})", saved.getName(), saved.getSlug());
        return saved;
    }

    @Transactional
    public Restaurant createForOwner(Long ownerUserId, CreateRestaurantRequest request) {
        UserAccount owner = userAccountRepository.findById(ownerUserId)
                .orElseThrow(() -> new NotFoundException("User", ownerUserId));

        long activeCount = userRestaurantRepository.countByUser_IdAndRoleAndRestaurant_Status(
                ownerUserId, RestaurantRole.OWNER, RestaurantStatus.ACTIVE);
        if (activeCount >= owner.getMaxRestaurants()) {
            throw new RestaurantQuotaExceededException(owner.getMaxRestaurants());
        }

        Restaurant restaurant = create(request);
        userRestaurantRepository.save(new UserRestaurant(owner, restaurant, RestaurantRole.OWNER));
        return restaurant;
    }

    /** Soft-deletes a restaurant. Only the OWNER may archive a restaurant.
     *  Archived restaurants are excluded from all lists.
     *  Access control is enforced by the caller (RestaurantController). */
    @Transactional
    public Restaurant archive(Long restaurantId) {
        Restaurant restaurant = findById(restaurantId);
        if (restaurant.getStatus() == RestaurantStatus.ARCHIVED || restaurant.getStatus() == RestaurantStatus.DELETED) {
            return restaurant;
        }
        restaurant.setStatus(RestaurantStatus.ARCHIVED);
        restaurant.setBookingEnabled(false);
        Restaurant saved = restaurantRepository.save(restaurant);
        int revoked = staffInviteRepository.revokeAllPendingByRestaurant(restaurantId, Instant.now());
        if (revoked > 0) {
            log.info("Revoked {} pending staff invite(s) for archived restaurant {}", revoked, restaurantId);
        }
        log.info("Archived restaurant: {} ({})", saved.getName(), saved.getSlug());
        return saved;
    }

    /** Soft-deletes a restaurant and marks it for physical purge by scheduled cleanup. */
    @Transactional
    public Restaurant markDeleted(Long restaurantId) {
        Restaurant restaurant = findById(restaurantId);
        if (restaurant.getStatus() == RestaurantStatus.DELETED) {
            return restaurant;
        }
        restaurant.setStatus(RestaurantStatus.DELETED);
        restaurant.setBookingEnabled(false);
        restaurant.setDeletedAtUtc(Instant.now());
        Restaurant saved = restaurantRepository.save(restaurant);
        int revoked = staffInviteRepository.revokeAllPendingByRestaurant(restaurantId, Instant.now());
        if (revoked > 0) {
            log.info("Revoked {} pending staff invite(s) for deleted restaurant {}", revoked, restaurantId);
        }
        log.info("Marked restaurant as deleted: {} ({})", saved.getName(), saved.getSlug());
        return saved;
    }

    @Transactional
    public Restaurant update(Long id, UpdateRestaurantRequest request) {
        Restaurant restaurant = findOperationalById(id);

        if (request.name() != null && !request.name().isBlank()) {
            restaurant.setName(request.name());
        }

        if (request.slug() != null && !request.slug().isBlank()) {
            String nextSlug = request.slug().trim();
            if (!nextSlug.equals(restaurant.getSlug())) {
                validateSlugUnique(nextSlug);
                restaurant.setSlug(nextSlug);
            }
        }

        if (request.timezone() != null && !request.timezone().isBlank()) {
            validateTimezone(request.timezone());
            restaurant.setTimezone(request.timezone());
        }

        if (request.locale() != null && !request.locale().isBlank()) {
            restaurant.setLocale(normalizeLocale(request.locale()));
        }

        if (request.bookingEnabled() != null) {
            restaurant.setBookingEnabled(request.bookingEnabled());
        }

        if (request.slotIntervalMinutes() != null) {
            restaurant.setSlotIntervalMinutes(request.slotIntervalMinutes());
        }

        if (request.defaultDurationMinutes() != null) {
            restaurant.setDefaultDurationMinutes(request.defaultDurationMinutes());
        }

        if (request.minNoticeMinutes() != null) {
            restaurant.setMinNoticeMinutes(request.minNoticeMinutes());
        }

        if (request.maxAdvanceDays() != null) {
            restaurant.setMaxAdvanceDays(request.maxAdvanceDays());
        }

        if (request.maxPartySize() != null) {
            restaurant.setMaxPartySize(request.maxPartySize());
        }

        if (request.assignmentMode() != null) {
            restaurant.setAssignmentMode(request.assignmentMode());
        }

        Restaurant saved = restaurantRepository.save(restaurant);
        log.info("Updated restaurant: {} ({})", saved.getName(), saved.getSlug());
        return saved;
    }

    @Transactional
    public Restaurant enableBooking(Long id) {
        Restaurant restaurant = findOperationalById(id);
        restaurant.setBookingEnabled(true);
        Restaurant saved = restaurantRepository.save(restaurant);
        log.info("Enabled booking for restaurant: {}", saved.getSlug());
        return saved;
    }

    @Transactional
    public Restaurant disableBooking(Long id) {
        Restaurant restaurant = findOperationalById(id);
        restaurant.setBookingEnabled(false);
        Restaurant saved = restaurantRepository.save(restaurant);
        log.info("Disabled booking for restaurant: {}", saved.getSlug());
        return saved;
    }

    @Transactional
    public void hardDelete(Long restaurantId) {
        Restaurant restaurant = findById(restaurantId);

        staffShiftAssignmentRepository.deleteByRestaurant_Id(restaurantId);
        reservationRepository.deleteByRestaurant_Id(restaurantId);
        holdRepository.deleteByRestaurant_Id(restaurantId);
        vacationRepository.deleteByRestaurant_Id(restaurantId);
        staffInviteRepository.revokeAllPendingByRestaurant(restaurantId, Instant.now());
        staffInviteRepository.deleteByRestaurant_Id(restaurantId);
        shiftRepository.deleteByRestaurant_Id(restaurantId);
        tableCombinationRepository.deleteByRestaurant_Id(restaurantId);
        diningTableRepository.deleteByRestaurant_Id(restaurantId);
        userRestaurantRepository.deleteByRestaurant_Id(restaurantId);
        restaurantRepository.delete(restaurant);

        log.info("Hard deleted restaurant: {} ({})", restaurant.getName(), restaurant.getSlug());
    }

    public void assertCanAcceptBookings(Restaurant restaurant) {
        if (isArchivedOrDeleted(restaurant)) {
            throw new NotFoundException("Restaurant", restaurant.getId());
        }
        if (!restaurant.isBookingEnabled()) {
            throw new ValidationException("Booking is currently disabled for this restaurant");
        }
    }

    private void validateTimezone(String timezone) {
        try {
            ZoneId.of(timezone);
        } catch (Exception e) {
            throw new ValidationException("Invalid IANA timezone: " + timezone, "timezone");
        }
    }

    private void validateSlugUnique(String slug) {
        if (restaurantRepository.existsBySlug(slug)) {
            throw new ConflictException("Restaurant with slug '" + slug + "' already exists", "restaurantSlug");
        }
    }

    private String normalizeLocale(String locale) {
        String trimmed = locale == null ? "" : locale.trim();
        if (trimmed.isEmpty()) {
            return "en";
        }

        if (trimmed.contains("-")) {
            String[] parts = trimmed.split("-", 2);
            return parts[0].toLowerCase(Locale.ROOT) + "-" + parts[1].toUpperCase(Locale.ROOT);
        }
        return trimmed.toLowerCase(Locale.ROOT);
    }

    private boolean isArchivedOrDeleted(Restaurant restaurant) {
        return restaurant.getStatus() == RestaurantStatus.ARCHIVED
                || restaurant.getStatus() == RestaurantStatus.DELETED;
    }
}
