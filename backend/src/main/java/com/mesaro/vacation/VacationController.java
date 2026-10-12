package com.mesaro.vacation;

import com.mesaro.common.ApiResponse;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.security.AuthPrincipal;
import com.mesaro.security.RestaurantAccessGuard;
import com.mesaro.security.RestaurantRole;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@Tag(name = "Vacations", description = "Vacation and closure management endpoints")
@Validated
public class VacationController {

    private final VacationService vacationService;
    private final RestaurantAccessGuard restaurantAccessGuard;
    private final UserAccountRepository userAccountRepository;

    public VacationController(VacationService vacationService,
                              RestaurantAccessGuard restaurantAccessGuard,
                              UserAccountRepository userAccountRepository) {
        this.vacationService = vacationService;
        this.restaurantAccessGuard = restaurantAccessGuard;
        this.userAccountRepository = userAccountRepository;
    }

    @GetMapping("/restaurants/{id}/vacations")
    @Operation(summary = "List vacations", description = "List vacations and closures for a restaurant")
    public ApiResponse<List<VacationResponse>> listVacations(
            @Parameter(description = "Restaurant ID") @PathVariable Long id) {
        requireRole(id, "STAFF");
        List<Vacation> vacations = vacationService.findByRestaurantWithRestaurant(id);
        Map<Long, UserAccount> usersById = resolveUsersById(vacations);
        List<VacationResponse> responses = vacations.stream()
                .map(vacation -> toResponse(vacation, usersById))
                .toList();
        return ApiResponse.success(responses);
    }

    @PostMapping("/restaurants/{id}/vacations")
    @Operation(summary = "Create vacation", description = "Create a staff vacation request or restaurant closure")
    public ApiResponse<VacationResponse> createVacation(
            @Parameter(description = "Restaurant ID") @PathVariable Long id,
            @Valid @RequestBody CreateVacationRequest request) {
        if (request.type() == null) {
            throw new ValidationException("Type is required", "type");
        }

        AuthPrincipal principal = requirePrincipal();
        Vacation vacation;
        if (request.type() == VacationType.RESTAURANT_CLOSURE) {
            requireRole(id, "MANAGER");
            if (request.closureReason() == null) {
                throw new ValidationException("Closure reason is required", "closureReason");
            }
            CreateClosureRequest closureRequest = new CreateClosureRequest(
                    request.startDate(),
                    request.endDate(),
                    request.closureReason(),
                    request.notes()
            );
            vacation = vacationService.createClosure(id, closureRequest, principal.getUserId());
        } else if (request.type() == VacationType.STAFF_VACATION) {
            requireRole(id, "STAFF");
            if (request.vacationReason() == null) {
                throw new ValidationException("Vacation reason is required", "vacationReason");
            }
            Long targetUserId = resolveUserIdForStaff(id, principal, request.userId());

            CreateStaffVacationRequest staffRequest = new CreateStaffVacationRequest(
                    targetUserId,
                    request.startDate(),
                    request.endDate(),
                    request.vacationReason(),
                    request.notes()
            );
            vacation = vacationService.createStaffVacation(id, staffRequest, principal.getUserId());
        } else {
            throw new ValidationException("Unsupported vacation type", "type");
        }

        Map<Long, UserAccount> usersById = resolveUsersById(List.of(vacation));
        return ApiResponse.success(toResponse(vacation, usersById), "Vacation created");
    }

    @GetMapping("/vacations/{id}")
    @Operation(summary = "Get vacation", description = "Get vacation details by ID")
    public ApiResponse<VacationResponse> getVacation(
            @Parameter(description = "Vacation ID") @PathVariable Long id) {
        Vacation vacation = vacationService.findByIdWithRestaurant(id);
        requireRole(vacation.getRestaurant().getId(), "STAFF");
        enforceStaffVisibility(vacation);
        Map<Long, UserAccount> usersById = resolveUsersById(List.of(vacation));
        return ApiResponse.success(toResponse(vacation, usersById));
    }

    @PutMapping("/vacations/{id}")
    @Operation(summary = "Update vacation", description = "Update a vacation or closure by ID")
    public ApiResponse<VacationResponse> updateVacation(
            @Parameter(description = "Vacation ID") @PathVariable Long id,
            @Valid @RequestBody UpdateVacationRequest request) {
        Vacation vacation = vacationService.findByIdWithRestaurant(id);
        if (vacation.isClosure()) {
            requireRole(vacation.getRestaurant().getId(), "MANAGER");
        } else {
            requireRole(vacation.getRestaurant().getId(), "STAFF");
            enforceStaffVisibility(vacation);
        }

        Vacation updated = vacationService.update(vacation.getRestaurant().getId(), id, request);
        Map<Long, UserAccount> usersById = resolveUsersById(List.of(updated));
        return ApiResponse.success(toResponse(updated, usersById), "Vacation updated");
    }

    @DeleteMapping("/vacations/{id}")
    @Operation(summary = "Delete vacation", description = "Delete a vacation or closure by ID")
    public ApiResponse<Void> deleteVacation(
            @Parameter(description = "Vacation ID") @PathVariable Long id) {
        Vacation vacation = vacationService.findByIdWithRestaurant(id);
        if (vacation.isClosure()) {
            requireRole(vacation.getRestaurant().getId(), "MANAGER");
        } else {
            requireRole(vacation.getRestaurant().getId(), "STAFF");
            enforceStaffVisibility(vacation);
        }

        vacationService.delete(vacation.getRestaurant().getId(), id);
        return ApiResponse.success(null, "Vacation deleted");
    }

    @PostMapping("/vacations/{id}/approve")
    @Operation(summary = "Approve staff vacation", description = "Approve a pending staff vacation")
    public ApiResponse<VacationResponse> approveVacation(
            @Parameter(description = "Vacation ID") @PathVariable Long id) {
        Vacation vacation = vacationService.findByIdWithRestaurant(id);
        requireRole(vacation.getRestaurant().getId(), "MANAGER");
        AuthPrincipal principal = requirePrincipal();
        Vacation approved = vacationService.approveStaffVacation(
                vacation.getRestaurant().getId(), id, principal.getUserId());
        Map<Long, UserAccount> usersById = resolveUsersById(List.of(approved));
        return ApiResponse.success(toResponse(approved, usersById), "Vacation approved");
    }

    @PostMapping("/vacations/{id}/reject")
    @Operation(summary = "Reject staff vacation", description = "Reject a pending staff vacation")
    public ApiResponse<VacationResponse> rejectVacation(
            @Parameter(description = "Vacation ID") @PathVariable Long id,
            @Valid @RequestBody(required = false) RejectVacationRequest request) {
        Vacation vacation = vacationService.findByIdWithRestaurant(id);
        requireRole(vacation.getRestaurant().getId(), "MANAGER");
        AuthPrincipal principal = requirePrincipal();
        String reason = request != null ? request.reason() : null;
        Vacation rejected = vacationService.rejectStaffVacation(
                vacation.getRestaurant().getId(), id, principal.getUserId(), reason);
        Map<Long, UserAccount> usersById = resolveUsersById(List.of(rejected));
        return ApiResponse.success(toResponse(rejected, usersById), "Vacation rejected");
    }

    private void requireRole(Long restaurantId, String role) {
        if (!restaurantAccessGuard.hasAtLeastRole(restaurantId, role)) {
            throw new AccessDeniedException("Access denied");
        }
    }

    private AuthPrincipal requirePrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthPrincipal principal)) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        return principal;
    }

    private void enforceStaffVisibility(Vacation vacation) {
        if (!vacation.isStaffVacation()) {
            return;
        }
        AuthPrincipal principal = requirePrincipal();
        if (vacation.getUserId() != null && !vacation.getUserId().equals(principal.getUserId())
                && !restaurantAccessGuard.hasAtLeastRole(vacation.getRestaurant().getId(), "MANAGER")) {
            throw new AccessDeniedException("Access denied");
        }
    }

    private Long resolveUserIdForStaff(Long restaurantId, AuthPrincipal principal, Long requestedUserId) {
        if (restaurantAccessGuard.hasAtLeastRole(restaurantId, "MANAGER")) {
            if (requestedUserId == null) {
                throw new ValidationException("User ID is required", "userId");
            }
            return requestedUserId;
        }
        return principal.getUserId();
    }

    private Map<Long, UserAccount> resolveUsersById(List<Vacation> vacations) {
        Set<Long> userIds = vacations.stream()
                .flatMap(vacation -> java.util.stream.Stream.of(vacation.getUserId(), vacation.getApprovedBy()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (userIds.isEmpty()) {
            return Map.of();
        }

        return userAccountRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, user -> user));
    }

    private VacationResponse toResponse(Vacation vacation, Map<Long, UserAccount> usersById) {
        UserAccount requester = vacation.getUserId() != null ? usersById.get(vacation.getUserId()) : null;
        UserAccount approver = vacation.getApprovedBy() != null ? usersById.get(vacation.getApprovedBy()) : null;

        return VacationResponse.from(
                vacation,
                requester != null ? requester.getFullName() : null,
                requester != null ? requester.getEmail() : null,
                approver != null ? approver.getFullName() : null
        );
    }
}
