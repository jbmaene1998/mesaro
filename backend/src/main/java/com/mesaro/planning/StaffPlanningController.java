package com.mesaro.planning;

import com.mesaro.common.ApiResponse;
import com.mesaro.security.AuthPrincipal;
import com.mesaro.security.RestaurantAccessGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(name = "Staff Planning", description = "Employee shift planning with vacation and closure constraints")
@Validated
public class StaffPlanningController {

    private final StaffPlanningService staffPlanningService;
    private final RestaurantAccessGuard restaurantAccessGuard;

    public StaffPlanningController(StaffPlanningService staffPlanningService, RestaurantAccessGuard restaurantAccessGuard) {
        this.staffPlanningService = staffPlanningService;
        this.restaurantAccessGuard = restaurantAccessGuard;
    }

    @GetMapping("/restaurants/{id}/staff-planning")
    @Operation(summary = "Get daily staff planning", description = "List shifts with assigned, available and unavailable staff for a date")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'STAFF')")
    public ApiResponse<StaffPlanningResponse> getDailyPlan(
            @Parameter(description = "Restaurant ID") @PathVariable Long id,
            @Parameter(description = "Service date (YYYY-MM-DD)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.success(staffPlanningService.getDailyPlan(id, date));
    }

    @PostMapping("/restaurants/{id}/staff-planning/assignments")
    @Operation(summary = "Assign staff to shift", description = "Assign staff to a shift on a date (rejects closure/vacation conflicts)")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'MANAGER')")
    public ApiResponse<StaffShiftAssignmentResponse> assignStaff(
            @Parameter(description = "Restaurant ID") @PathVariable Long id,
            @Valid @RequestBody AssignStaffShiftRequest request) {
        AuthPrincipal principal = requirePrincipal();
        StaffShiftAssignmentResponse response = staffPlanningService.assign(id, request, principal.getUserId());
        return ApiResponse.success(response, "Staff assigned");
    }

    @PostMapping("/restaurants/{id}/staff-planning/assignments/recurring-week")
    @Operation(summary = "Assign staff recurring for week",
            description = "Assign staff to matching shifts for all days in the week of the provided date")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'MANAGER')")
    public ApiResponse<AssignStaffRecurringWeekResponse> assignStaffRecurringWeek(
            @Parameter(description = "Restaurant ID") @PathVariable Long id,
            @Valid @RequestBody AssignStaffRecurringWeekRequest request) {
        AuthPrincipal principal = requirePrincipal();
        AssignStaffRecurringWeekResponse response = staffPlanningService.assignRecurringWeek(id, request, principal.getUserId());
        return ApiResponse.success(response, "Recurring weekly assignment created");
    }

    @GetMapping("/restaurants/{id}/staff-planning/work-hours")
    @Operation(summary = "Get weekly planned work hours", description = "List planned weekly work hours for staff and managers")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'STAFF')")
    public ApiResponse<List<StaffWeeklyWorkHoursResponse>> getWeeklyWorkHours(
            @Parameter(description = "Restaurant ID") @PathVariable Long id,
            @Parameter(description = "Week start date (YYYY-MM-DD, normalized to Monday)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate) {
        return ApiResponse.success(staffPlanningService.getWeeklyWorkHours(id, weekStartDate));
    }

    @PostMapping("/restaurants/{id}/staff-planning/work-hours")
    @Operation(summary = "Set weekly planned work hours", description = "Set planned weekly hours for a staff/manager user")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'MANAGER')")
    public ApiResponse<StaffWeeklyWorkHoursResponse> upsertWeeklyWorkHours(
            @Parameter(description = "Restaurant ID") @PathVariable Long id,
            @Valid @RequestBody UpsertWeeklyWorkHoursRequest request) {
        AuthPrincipal principal = requirePrincipal();
        StaffWeeklyWorkHoursResponse response = staffPlanningService.upsertWeeklyWorkHours(id, request, principal.getUserId());
        return ApiResponse.success(response, "Weekly work hours saved");
    }

    @DeleteMapping("/staff-planning/assignments/{id}")
    @Operation(summary = "Remove staff assignment", description = "Remove planned staff assignment from a shift")
    public ApiResponse<Void> removeAssignment(@PathVariable Long id) {
        StaffShiftAssignment assignment = staffPlanningService.findByIdWithAssociations(id);
        if (!restaurantAccessGuard.hasAtLeastRole(assignment.getRestaurant().getId(), "MANAGER")) {
            throw new AccessDeniedException("Access denied");
        }
        AuthPrincipal principal = requirePrincipal();
        staffPlanningService.remove(assignment.getRestaurant().getId(), id, principal.getUserId());
        return ApiResponse.success(null, "Staff assignment removed");
    }

    private AuthPrincipal requirePrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthPrincipal principal)) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        return principal;
    }
}
