package com.mesaro.restaurant;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.NotFoundException;
import com.mesaro.common.exception.RestaurantQuotaExceededException;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.hold.HoldRepository;
import com.mesaro.planning.StaffShiftAssignmentRepository;
import com.mesaro.reservation.ReservationRepository;
import com.mesaro.security.RestaurantRole;
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
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class RestaurantService {

    private static final Logger log = LoggerFactory.getLogger(RestaurantService.class);

    private final RestaurantRepository restaurantRepository;
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
    private final AuditService auditService;

    public RestaurantService(RestaurantRepository restaurantRepository,
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
                             AuditService auditService) {
        this.restaurantRepository = restaurantRepository;
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

    @Transactional
    public Restaurant create(CreateRestaurantRequest request) {
        return create(request, null);
    }

    @Transactional
    public Restaurant create(CreateRestaurantRequest request, Long actorUserId) {
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
        auditService.record(
                AuditEventType.RESTAURANT_CREATED,
                saved.getId(),
                actorUserId,
                saved.getId(),
                "RESTAURANT",
                Map.of("slug", saved.getSlug())
        );
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

        Restaurant restaurant = create(request, ownerUserId);
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
        auditService.record(
                AuditEventType.RESTAURANT_ARCHIVED,
                restaurantId,
                null,
                restaurantId,
                "RESTAURANT",
                Map.of("slug", saved.getSlug())
        );
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
        auditService.record(
                AuditEventType.RESTAURANT_DELETED,
                restaurantId,
                null,
                restaurantId,
                "RESTAURANT",
                Map.of("slug", saved.getSlug())
        );
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
            if (Boolean.TRUE.equals(request.bookingEnabled()) && !restaurant.isBookingEnabled()) {
                assertCanEnableBookings(id);
            }
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
        auditService.record(
                AuditEventType.RESTAURANT_UPDATED,
                id,
                null,
                id,
                "RESTAURANT",
                Map.of("slug", saved.getSlug(), "bookingEnabled", saved.isBookingEnabled())
        );
        return saved;
    }

    @Transactional
    public Restaurant enableBooking(Long id) {
        Restaurant restaurant = findOperationalById(id);
        if (!restaurant.isBookingEnabled()) {
            assertCanEnableBookings(id);
        }
        restaurant.setBookingEnabled(true);
        Restaurant saved = restaurantRepository.save(restaurant);
        log.info("Enabled booking for restaurant: {}", saved.getSlug());
        auditService.record(
                AuditEventType.RESTAURANT_BOOKING_ENABLED,
                id,
                null,
                id,
                "RESTAURANT",
                Map.of("slug", saved.getSlug())
        );
        return saved;
    }

    @Transactional
    public Restaurant disableBooking(Long id) {
        Restaurant restaurant = findOperationalById(id);
        restaurant.setBookingEnabled(false);
        Restaurant saved = restaurantRepository.save(restaurant);
        log.info("Disabled booking for restaurant: {}", saved.getSlug());
        auditService.record(
                AuditEventType.RESTAURANT_BOOKING_DISABLED,
                id,
                null,
                id,
                "RESTAURANT",
                Map.of("slug", saved.getSlug())
        );
        return saved;
    }

    @Transactional
    public void hardDelete(Long restaurantId) {
        Restaurant restaurant = findById(restaurantId);
        String slug = restaurant.getSlug();

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

        log.info("Hard deleted restaurant: {} ({})", restaurant.getName(), slug);
        auditService.record(
                AuditEventType.RESTAURANT_HARD_DELETED,
                restaurantId,
                null,
                restaurantId,
                "RESTAURANT",
                Map.of("slug", slug)
        );
    }

    public void assertCanAcceptBookings(Restaurant restaurant) {
        if (isArchivedOrDeleted(restaurant)) {
            throw new NotFoundException("Restaurant", restaurant.getId());
        }
        if (!restaurant.isBookingEnabled()) {
            throw new ValidationException("Booking is currently disabled for this restaurant");
        }
    }

    private void assertCanEnableBookings(Long restaurantId) {
        if (!diningTableRepository.existsByRestaurantId(restaurantId)) {
            throw new ValidationException(
                    "Add at least one table before enabling bookings",
                    "bookingEnabled"
            );
        }
        if (!shiftRepository.existsByRestaurantIdAndStatus(restaurantId, ShiftStatus.ACTIVE)) {
            throw new ValidationException(
                    "Add at least one active shift before enabling bookings",
                    "bookingEnabled"
            );
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
