package com.mesaro.vacation;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.NotFoundException;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.infra.EmailService;
import com.mesaro.planning.StaffShiftAssignment;
import com.mesaro.planning.StaffShiftAssignmentRepository;
import com.mesaro.reservation.Reservation;
import com.mesaro.reservation.ReservationRepository;
import com.mesaro.reservation.ReservationStatus;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.security.RestaurantAccessGuard;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserRestaurantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class VacationService {

    private static final Logger log = LoggerFactory.getLogger(VacationService.class);

    private final VacationRepository vacationRepository;
    private final RestaurantService restaurantService;
    private final UserAccountRepository userAccountRepository;
    private final UserRestaurantRepository userRestaurantRepository;
    private final StaffShiftAssignmentRepository assignmentRepository;
    private final ReservationRepository reservationRepository;
    private final EmailService emailService;
    private final AuditService auditService;
    private final RestaurantAccessGuard restaurantAccessGuard;

    public VacationService(VacationRepository vacationRepository,
                           RestaurantService restaurantService,
                           UserAccountRepository userAccountRepository,
                           UserRestaurantRepository userRestaurantRepository,
                           StaffShiftAssignmentRepository assignmentRepository,
                           ReservationRepository reservationRepository,
                           EmailService emailService,
                           AuditService auditService,
                           RestaurantAccessGuard restaurantAccessGuard) {
        this.vacationRepository = vacationRepository;
        this.restaurantService = restaurantService;
        this.userAccountRepository = userAccountRepository;
        this.userRestaurantRepository = userRestaurantRepository;
        this.assignmentRepository = assignmentRepository;
        this.reservationRepository = reservationRepository;
        this.emailService = emailService;
        this.auditService = auditService;
        this.restaurantAccessGuard = restaurantAccessGuard;
    }

    public Vacation findById(Long id) {
        return vacationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Vacation", id));
    }

    public Vacation findByIdWithRestaurant(Long id) {
        return vacationRepository.findByIdWithRestaurant(id)
                .orElseThrow(() -> new NotFoundException("Vacation", id));
    }

    public Vacation findByIdAndRestaurant(Long id, Long restaurantId) {
        Vacation vacation = findById(id);
        if (!vacation.getRestaurant().getId().equals(restaurantId)) {
            throw new NotFoundException("Vacation", id);
        }
        return vacation;
    }

    public List<Vacation> findByRestaurant(Long restaurantId) {
        return vacationRepository.findByRestaurantIdOrderByStartDateDesc(restaurantId);
    }

    public List<Vacation> findByRestaurantWithRestaurant(Long restaurantId) {
        return vacationRepository.findByRestaurantIdWithRestaurant(restaurantId);
    }

    public List<Vacation> findClosuresByRestaurant(Long restaurantId) {
        return vacationRepository.findByRestaurantIdAndTypeOrderByStartDateDesc(
                restaurantId, VacationType.RESTAURANT_CLOSURE);
    }

    public List<Vacation> findStaffVacationsByRestaurant(Long restaurantId) {
        return vacationRepository.findByRestaurantIdAndTypeOrderByStartDateDesc(
                restaurantId, VacationType.STAFF_VACATION);
    }

    public List<Vacation> findPendingStaffVacations(Long restaurantId) {
        return vacationRepository.findStaffVacationsByStatus(restaurantId, VacationStatus.PENDING);
    }

    public List<Vacation> findStaffVacationsByUser(Long restaurantId, Long userId) {
        return vacationRepository.findByRestaurantIdAndUserIdOrderByStartDateDesc(restaurantId, userId);
    }

    public boolean isRestaurantClosed(Long restaurantId, LocalDate date) {
        return vacationRepository.isRestaurantClosedOnDate(restaurantId, date);
    }

    public String getClosureReason(Long restaurantId, LocalDate date) {
        List<Vacation> closures = vacationRepository.findActiveClosuresOnDate(restaurantId, date);
        if (closures.isEmpty()) {
            return null;
        }
        return closures.get(0).getReason();
    }

    public List<Vacation> getClosuresBetween(Long restaurantId, LocalDate startDate, LocalDate endDate) {
        validateDateRange(startDate, endDate);
        return vacationRepository.findClosuresBetween(restaurantId, startDate, endDate);
    }

    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')")
    public Vacation createClosure(Long restaurantId, CreateClosureRequest request, Long actorUserId) {
        Restaurant restaurant = restaurantService.findById(restaurantId);
        validateDateRange(request.startDate(), request.endDate());
        validateNoOverlappingClosures(restaurantId, request.startDate(), request.endDate(), null);
        List<Reservation> affected = reservationRepository
                .findByRestaurantAndDateRangeWithStatus(
                        restaurantId,
                        request.startDate().atStartOfDay(ZoneOffset.UTC).toInstant(),
                        request.endDate().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant(),
                        List.of(ReservationStatus.CONFIRMED, ReservationStatus.SEATED)
                );

        Vacation closure = Vacation.createClosure(
                restaurant,
                request.reason(),
                request.startDate(),
                request.endDate()
        );
        closure.setNotes(request.notes());

        Vacation saved = vacationRepository.save(closure);
        saved.setAffectedReservations(affected.size());
        if (!affected.isEmpty()) {
            for (Reservation reservation : affected) {
                reservation.cancel();
                reservationRepository.save(reservation);
                auditService.recordReservationEvent(
                        AuditEventType.RESERVATION_CANCELLED,
                        restaurantId,
                        actorUserId,
                        reservation.getId(),
                        Map.of(
                                "cancelledBy", "RESTAURANT_CLOSURE",
                                "confirmationCode", reservation.getConfirmationCode()
                        )
                );
                try {
                    emailService.sendReservationCancelled(
                            reservation.getGuestEmail(),
                            reservation.getGuestName(),
                            restaurant.getName(),
                            reservation.getConfirmationCode(),
                            "RESTAURANT_CLOSURE"
                    );
                } catch (Exception ex) {
                    log.warn("Failed to send closure cancellation email for reservation {}: {}",
                            reservation.getId(), ex.getMessage());
                }
            }
        }
        log.info("Created closure for restaurant {} from {} to {}",
                restaurantId, request.startDate(), request.endDate());

        auditService.record(
                AuditEventType.VACATION_CREATED,
                restaurantId,
                actorUserId,
                saved.getId(),
                "VACATION",
                Map.of(
                        "type", saved.getType().name(),
                        "reason", saved.getReason(),
                        "startDate", saved.getStartDate(),
                        "endDate", saved.getEndDate(),
                        "affectedReservations", affected.size()
                )
        );
        return saved;
    }

    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    public Vacation createStaffVacation(Long restaurantId, CreateStaffVacationRequest request, Long actorUserId) {
        if (!restaurantAccessGuard.hasAtLeastRole(restaurantId, "MANAGER")
                && !request.userId().equals(actorUserId)) {
            throw new AccessDeniedException("Staff can only create vacation requests for themselves");
        }

        Restaurant restaurant = restaurantService.findById(restaurantId);
        validateUserMembership(restaurantId, request.userId());
        validateDateRange(request.startDate(), request.endDate());
        validateNoOverlappingUserVacations(restaurantId, request.userId(),
                request.startDate(), request.endDate());

        Vacation vacation = Vacation.createStaffVacation(
                restaurant,
                request.userId(),
                request.reason(),
                request.startDate(),
                request.endDate()
        );
        vacation.setNotes(request.notes());

        Vacation saved = vacationRepository.save(vacation);
        log.info("Created staff vacation request for user {} in restaurant {} from {} to {}",
                request.userId(), restaurantId, request.startDate(), request.endDate());

        auditService.record(
                AuditEventType.VACATION_CREATED,
                restaurantId,
                actorUserId,
                saved.getId(),
                "VACATION",
                Map.of(
                        "type", saved.getType().name(),
                        "reason", saved.getReason(),
                        "startDate", saved.getStartDate(),
                        "endDate", saved.getEndDate(),
                        "status", saved.getStatus().name(),
                        "userId", saved.getUserId()
                )
        );
        return saved;
    }

    @Transactional
    // Guard added in authorization audit: manager role required for updates.
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')")
    public Vacation update(Long restaurantId, Long vacationId, UpdateVacationRequest request) {
        Vacation vacation = findByIdAndRestaurant(vacationId, restaurantId);

        if (vacation.isApproved() && vacation.isClosure()) {
            throw new ConflictException("Cannot modify an approved closure. Delete and recreate instead.");
        }

        if (vacation.getStatus() == VacationStatus.REJECTED ||
                vacation.getStatus() == VacationStatus.CANCELLED) {
            throw new ConflictException("Cannot modify a rejected or cancelled vacation");
        }

        LocalDate startDate = request.startDate() != null ? request.startDate() : vacation.getStartDate();
        LocalDate endDate = request.endDate() != null ? request.endDate() : vacation.getEndDate();
        validateDateRange(startDate, endDate);

        if (vacation.isClosure()) {
            validateNoOverlappingClosures(restaurantId, startDate, endDate, vacationId);
        } else if (vacation.isStaffVacation()) {
            if (request.startDate() != null || request.endDate() != null) {
                validateNoOverlappingUserVacationsExcluding(restaurantId, vacation.getUserId(),
                        startDate, endDate, vacationId);
            }
        }

        if (request.startDate() != null) {
            vacation.setStartDate(request.startDate());
        }
        if (request.endDate() != null) {
            vacation.setEndDate(request.endDate());
        }
        if (vacation.isClosure() && request.closureReason() != null) {
            vacation.setReason(request.closureReason().name());
        }
        if (vacation.isStaffVacation() && request.vacationReason() != null) {
            vacation.setReason(request.vacationReason().name());
        }
        if (request.notes() != null) {
            vacation.setNotes(request.notes());
        }

        Vacation saved = vacationRepository.save(vacation);
        log.info("Updated vacation {} for restaurant {}", vacationId, restaurantId);
        return saved;
    }

    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')")
    public Vacation approveStaffVacation(Long restaurantId, Long vacationId, Long approvedByUserId) {
        Vacation vacation = vacationRepository.findByIdWithRestaurantForUpdate(vacationId)
                .orElseThrow(() -> new NotFoundException("Vacation", vacationId));
        if (!vacation.getRestaurant().getId().equals(restaurantId)) {
            throw new NotFoundException("Vacation", vacationId);
        }

        if (!vacation.isStaffVacation()) {
            throw new ValidationException("Only staff vacations require approval", "type");
        }

        Instant approvedAt = Instant.now();
        int rowsUpdated = vacationRepository.approveIfPending(vacationId, approvedByUserId, approvedAt);

        if (rowsUpdated == 0) {
            Vacation current = findByIdAndRestaurant(vacationId, restaurantId);
            if (current.getStatus() == VacationStatus.APPROVED) {
                return current;
            }
            throw new ConflictException("Vacation is not pending approval");
        }

        Vacation saved = findByIdAndRestaurant(vacationId, restaurantId);
        List<StaffShiftAssignment> toRemove = List.of();
        long removedAssignments = 0L;
        if (saved.getUserId() != null) {
            toRemove = assignmentRepository.findByRestaurant_IdAndUser_IdAndServiceDateBetween(
                    restaurantId,
                    saved.getUserId(),
                    saved.getStartDate(),
                    saved.getEndDate()
            );
            removedAssignments = assignmentRepository.deleteByRestaurant_IdAndUser_IdAndServiceDateBetween(
                    restaurantId,
                    saved.getUserId(),
                    saved.getStartDate(),
                    saved.getEndDate()
            );
        }
        log.info("Approved staff vacation {} by user {}", vacationId, approvedByUserId);

        auditService.record(
                AuditEventType.VACATION_APPROVED,
                restaurantId,
                approvedByUserId,
                saved.getId(),
                "VACATION",
                Map.of(
                        "status", saved.getStatus().name(),
                        "userId", saved.getUserId(),
                        "removedAssignmentIds", toRemove.stream().map(StaffShiftAssignment::getId).toList(),
                        "removedAssignments", removedAssignments
                )
        );
        for (StaffShiftAssignment assignment : toRemove) {
            auditService.record(
                    AuditEventType.STAFF_SHIFT_UNPLANNED,
                    restaurantId,
                    approvedByUserId,
                    assignment.getId(),
                    "STAFF_SHIFT_ASSIGNMENT",
                    Map.of(
                            "shiftId", assignment.getShift().getId(),
                            "serviceDate", assignment.getServiceDate().toString()
                    )
            );
        }
        return saved;
    }

    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')")
    public Vacation rejectStaffVacation(Long restaurantId, Long vacationId, Long rejectedByUserId, String reason) {
        Vacation vacation = vacationRepository.findByIdWithRestaurantForUpdate(vacationId)
                .orElseThrow(() -> new NotFoundException("Vacation", vacationId));
        if (!vacation.getRestaurant().getId().equals(restaurantId)) {
            throw new NotFoundException("Vacation", vacationId);
        }

        if (!vacation.isStaffVacation()) {
            throw new ValidationException("Only staff vacations can be rejected", "type");
        }
        if (vacation.getStatus() == VacationStatus.REJECTED) {
            return vacation;
        }
        if (!vacation.isPending()) {
            throw new ConflictException("Vacation is not pending");
        }

        Instant rejectedAt = Instant.now();
        String notes = buildRejectionNotes(vacation.getNotes(), reason);
        int rowsUpdated = vacationRepository.rejectIfPending(vacationId, rejectedByUserId, rejectedAt);
        if (rowsUpdated == 0) {
            Vacation current = findByIdAndRestaurant(vacationId, restaurantId);
            if (current.getStatus() == VacationStatus.REJECTED) {
                return current;
            }
            throw new ConflictException("Vacation is not pending");
        }

        Vacation saved = findByIdAndRestaurant(vacationId, restaurantId);
        if (notes != null) {
            saved.setNotes(notes);
            saved = vacationRepository.save(saved);
        }
        log.info("Rejected staff vacation {} by user {}", vacationId, rejectedByUserId);

        auditService.record(
                AuditEventType.VACATION_REJECTED,
                restaurantId,
                rejectedByUserId,
                saved.getId(),
                "VACATION",
                Map.of(
                        "status", saved.getStatus().name(),
                        "userId", saved.getUserId()
                )
        );
        return saved;
    }

    @Transactional
    // Guard added in authorization audit: manager role required for cancellation.
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')")
    public Vacation cancel(Long restaurantId, Long vacationId, Long actorUserId) {
        Vacation vacation = findByIdAndRestaurant(vacationId, restaurantId);

        if (vacation.getStatus() == VacationStatus.CANCELLED) {
            return vacation;
        }
        if (vacation.getStatus() == VacationStatus.REJECTED) {
            throw new ConflictException("Cannot cancel a rejected vacation");
        }

        boolean wasApproved = vacation.getStatus() == VacationStatus.APPROVED;
        vacation.setStatus(VacationStatus.CANCELLED);

        Vacation saved = vacationRepository.save(vacation);
        if (wasApproved && vacation.getUserId() != null) {
            log.info("Vacation {} was APPROVED before cancellation; shift assignments for user {} between {} and {} were previously deleted and are NOT automatically restored. Manual re-planning required.",
                    vacationId, vacation.getUserId(), vacation.getStartDate(), vacation.getEndDate());
        }
        auditService.record(
                AuditEventType.VACATION_CANCELLED,
                restaurantId,
                actorUserId,
                vacationId,
                "VACATION",
                Map.of(
                        "userId", vacation.getUserId() != null ? vacation.getUserId() : "N/A",
                        "wasApproved", wasApproved,
                        "startDate", vacation.getStartDate().toString(),
                        "endDate", vacation.getEndDate().toString()
                )
        );
        log.info("Cancelled vacation {} for restaurant {}", vacationId, restaurantId);
        return saved;
    }

    @Transactional
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')")
    public void delete(Long restaurantId, Long vacationId) {
        Vacation vacation = findByIdAndRestaurant(vacationId, restaurantId);
        vacationRepository.delete(vacation);
        log.info("Deleted vacation {} from restaurant {}", vacationId, restaurantId);
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new ValidationException("Start date must be on or before end date", "startDate");
        }
    }

    private void validateNoOverlappingClosures(Long restaurantId, LocalDate startDate,
                                                LocalDate endDate, Long excludeId) {
        List<Vacation> overlapping = vacationRepository.findOverlappingClosures(
                restaurantId, startDate, endDate, excludeId);

        if (!overlapping.isEmpty()) {
            Vacation first = overlapping.get(0);
            throw new ConflictException(String.format(
                    "Closure overlaps with existing closure from %s to %s",
                    first.getStartDate(), first.getEndDate()));
        }
    }

    private void validateNoOverlappingUserVacations(Long restaurantId, Long userId,
                                                     LocalDate startDate, LocalDate endDate) {
        List<Vacation> overlapping = vacationRepository.findOverlappingVacationsForUser(
                restaurantId, userId, startDate, endDate);

        if (!overlapping.isEmpty()) {
            Vacation first = overlapping.get(0);
            throw new ConflictException(String.format(
                    "User already has vacation from %s to %s",
                    first.getStartDate(), first.getEndDate()));
        }
    }

    private void validateUserMembership(Long restaurantId, Long userId) {
        if (userId == null) {
            throw new ValidationException("User ID is required", "userId");
        }
        userAccountRepository.findById(userId)
                .orElseThrow(() -> new ValidationException("User does not exist", "userId"));
        if (!userRestaurantRepository.existsByUser_IdAndRestaurant_Id(userId, restaurantId)) {
            throw new ValidationException("User is not a member of this restaurant", "userId");
        }
    }

    private void validateNoOverlappingUserVacationsExcluding(Long restaurantId, Long userId,
                                                              LocalDate startDate, LocalDate endDate,
                                                              Long excludeId) {
        List<Vacation> overlapping = vacationRepository.findOverlappingVacationsForUser(
                restaurantId, userId, startDate, endDate);

        overlapping.removeIf(v -> v.getId().equals(excludeId));

        if (!overlapping.isEmpty()) {
            Vacation first = overlapping.get(0);
            throw new ConflictException(String.format(
                    "User already has vacation from %s to %s",
                    first.getStartDate(), first.getEndDate()));
        }
    }

    private String buildRejectionNotes(String existing, String reason) {
        if (reason == null || reason.isBlank()) {
            return null;
        }
        return (existing != null ? existing + "\n" : "") + "Rejection reason: " + reason;
    }
}
