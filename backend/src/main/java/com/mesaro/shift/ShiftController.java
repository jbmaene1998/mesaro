package com.mesaro.shift;

import com.mesaro.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(name = "Shifts", description = "Shift management endpoints")
@Validated
public class ShiftController {

    private final ShiftService shiftService;

    public ShiftController(ShiftService shiftService) {
        this.shiftService = shiftService;
    }

    @GetMapping("/restaurants/{id}/shifts")
    @Operation(summary = "List shifts", description = "List shifts for a restaurant")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'STAFF')")
    public ApiResponse<List<ShiftResponse>> listShifts(
            @Parameter(description = "Restaurant ID") @PathVariable Long id) {
        List<ShiftResponse> shifts = shiftService.findByRestaurant(id).stream()
                .map(ShiftResponse::from)
                .toList();
        return ApiResponse.success(shifts);
    }

    @PostMapping("/restaurants/{id}/shifts")
    @Operation(summary = "Create shift", description = "Create a shift for a restaurant")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ShiftResponse> createShift(
            @Parameter(description = "Restaurant ID") @PathVariable Long id,
            @Valid @RequestBody CreateShiftRequest request) {
        Shift shift = shiftService.create(id, request);
        return ApiResponse.success(ShiftResponse.from(shift), "Shift created");
    }

    @PostMapping("/restaurants/{id}/shifts/bulk")
    @Operation(summary = "Bulk create shifts", description = "Create multiple shifts (optionally activate) for onboarding templates")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<List<ShiftResponse>> createShiftsBulk(
            @Parameter(description = "Restaurant ID") @PathVariable Long id,
            @Valid @RequestBody BulkCreateShiftsRequest request) {
        List<ShiftResponse> shifts = shiftService.createBulk(id, request).stream()
                .map(ShiftResponse::from)
                .toList();
        return ApiResponse.success(shifts, "Shifts created");
    }

    @GetMapping("/shifts/{id}")
    @Operation(summary = "Get shift", description = "Get shift details by ID")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    public ApiResponse<ShiftResponse> getShift(
            @Parameter(description = "Shift ID") @PathVariable Long id,
            @Parameter(description = "Restaurant ID") @RequestParam Long restaurantId) {
        Shift shift = shiftService.findByIdAndRestaurant(id, restaurantId);
        return ApiResponse.success(ShiftResponse.from(shift));
    }

    @PutMapping("/shifts/{id}")
    @Operation(summary = "Update shift", description = "Update a shift by ID")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')")
    public ApiResponse<ShiftResponse> updateShift(
            @Parameter(description = "Shift ID") @PathVariable Long id,
            @Parameter(description = "Restaurant ID") @RequestParam Long restaurantId,
            @Valid @RequestBody UpdateShiftRequest request) {
        Shift updated = shiftService.update(restaurantId, id, request);
        return ApiResponse.success(ShiftResponse.from(updated), "Shift updated");
    }

    @PostMapping("/shifts/{id}/activate")
    @Operation(summary = "Publish shift", description = "Publish a draft or inactive shift so it becomes bookable")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')")
    public ApiResponse<ShiftResponse> activateShift(
            @Parameter(description = "Shift ID") @PathVariable Long id,
            @Parameter(description = "Restaurant ID") @RequestParam Long restaurantId) {
        Shift activated = shiftService.activate(restaurantId, id);
        return ApiResponse.success(ShiftResponse.from(activated), "Shift published");
    }

    @PostMapping("/restaurants/{id}/shifts/publish")
    @Operation(summary = "Publish draft shifts", description = "Publish all draft shifts for a restaurant")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'MANAGER')")
    public ApiResponse<List<ShiftResponse>> publishDraftShifts(
            @Parameter(description = "Restaurant ID") @PathVariable Long id) {
        List<ShiftResponse> published = shiftService.publishDrafts(id).stream()
                .map(ShiftResponse::from)
                .toList();
        return ApiResponse.success(published, "Draft shifts published");
    }

    @PostMapping("/shifts/{id}/deactivate")
    @Operation(summary = "Deactivate shift", description = "Deactivate an active shift")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')")
    public ApiResponse<ShiftResponse> deactivateShift(
            @Parameter(description = "Shift ID") @PathVariable Long id,
            @Parameter(description = "Restaurant ID") @RequestParam Long restaurantId) {
        Shift deactivated = shiftService.deactivate(restaurantId, id);
        return ApiResponse.success(ShiftResponse.from(deactivated), "Shift deactivated");
    }

    @DeleteMapping("/shifts/{id}")
    @Operation(summary = "Delete shift", description = "Delete a shift by ID")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'MANAGER')")
    public ApiResponse<Void> deleteShift(
            @Parameter(description = "Shift ID") @PathVariable Long id,
            @Parameter(description = "Restaurant ID") @RequestParam Long restaurantId) {
        shiftService.delete(restaurantId, id);
        return ApiResponse.success(null, "Shift deleted");
    }
}
