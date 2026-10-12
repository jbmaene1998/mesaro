package com.mesaro.reservation;

import com.mesaro.common.ApiResponse;
import com.mesaro.common.exception.PreconditionFailedException;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.security.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api/admin/reservations")
@Tag(name = "Admin - Reservations", description = "Reservation management endpoints for staff")
@Validated
public class ReservationAdminController {

    private final ReservationAdminService adminService;
    private final RestaurantService restaurantService;

    public ReservationAdminController(ReservationAdminService adminService,
                                       RestaurantService restaurantService) {
        this.adminService = adminService;
        this.restaurantService = restaurantService;
    }

    @GetMapping
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    @Operation(summary = "List reservations", description = "List reservations for the current restaurant with optional filters")
    public ApiResponse<List<ReservationResponse>> listReservations(
            @Parameter(description = "Restaurant ID") @RequestParam @Positive Long restaurantId,
            @Parameter(description = "Single date filter") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Parameter(description = "Start date for range") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date for range") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @Parameter(description = "Status filter") @RequestParam(required = false) List<ReservationStatus> statuses) {

        ReservationListRequest request = new ReservationListRequest(date, startDate, endDate, statuses);
        List<Reservation> reservations = adminService.listReservations(restaurantId, request);

        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        List<ReservationResponse> responses = reservations.stream()
                .map(r -> ReservationResponse.from(r, timezone))
                .toList();

        return ApiResponse.success(responses);
    }

    @PostMapping
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    @Operation(summary = "Create walk-in reservation", description = "Create a walk-in reservation for a guest")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ReservationResponse> createWalkIn(
            @Parameter(description = "Restaurant ID") @RequestParam @Positive Long restaurantId,
            @Valid @RequestBody AdminReservationCreateRequest request) {

        Long userId = requirePrincipal().getUserId();
        Reservation reservation = adminService.createWalkIn(restaurantId, request, userId);

        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        return ApiResponse.success(ReservationResponse.from(reservation, timezone), "Reservation created");
    }

    @GetMapping("/{id}")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    @Operation(summary = "Get reservation", description = "Get reservation details by ID")
    public ResponseEntity<ApiResponse<ReservationResponse>> getReservation(
            @Parameter(description = "Restaurant ID") @RequestParam @Positive Long restaurantId,
            @Parameter(description = "Reservation ID") @PathVariable Long id) {

        Reservation reservation = adminService.getReservation(restaurantId, id);

        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        ReservationResponse response = ReservationResponse.from(reservation, timezone);
        return ResponseEntity.ok()
                .eTag("\"" + reservation.getVersion() + "\"")
                .body(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    @Operation(summary = "Update reservation", description = "Update guest details and notes for a reservation")
    public ApiResponse<ReservationResponse> updateReservation(
            @Parameter(description = "Restaurant ID") @RequestParam @Positive Long restaurantId,
            @Parameter(description = "Reservation ID") @PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestHeader(value = "If-Match", required = true) String ifMatchHeader,
            @Valid @RequestBody AdminReservationUpdateRequest request) {

        Long userId = requirePrincipal().getUserId();
        long expectedVersion = parseIfMatch(ifMatchHeader);
        Reservation reservation = adminService.updateReservation(restaurantId, id, request, userId, expectedVersion);

        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        return ApiResponse.success(ReservationResponse.from(reservation, timezone), "Reservation updated");
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    @Operation(summary = "Cancel reservation", description = "Cancel a reservation (admin action)")
    public ApiResponse<ReservationResponse> cancelReservation(
            @Parameter(description = "Restaurant ID") @RequestParam @Positive Long restaurantId,
            @Parameter(description = "Reservation ID") @PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestHeader(value = "If-Match", required = true) String ifMatchHeader) {

        Long userId = requirePrincipal().getUserId();
        Reservation reservation = adminService.cancel(restaurantId, id, userId, parseIfMatch(ifMatchHeader));

        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        return ApiResponse.success(ReservationResponse.from(reservation, timezone), "Reservation cancelled");
    }

    @PostMapping("/{id}/seat")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    @Operation(summary = "Seat guests", description = "Mark reservation as seated")
    public ApiResponse<ReservationResponse> seatReservation(
            @Parameter(description = "Restaurant ID") @RequestParam @Positive Long restaurantId,
            @Parameter(description = "Reservation ID") @PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestHeader(value = "If-Match", required = true) String ifMatchHeader) {

        Long userId = requirePrincipal().getUserId();
        Reservation reservation = adminService.seat(restaurantId, id, userId, parseIfMatch(ifMatchHeader));

        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        return ApiResponse.success(ReservationResponse.from(reservation, timezone), "Guests seated");
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    @Operation(summary = "Complete reservation", description = "Mark reservation as completed (guests departed)")
    public ApiResponse<ReservationResponse> completeReservation(
            @Parameter(description = "Restaurant ID") @RequestParam @Positive Long restaurantId,
            @Parameter(description = "Reservation ID") @PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestHeader(value = "If-Match", required = true) String ifMatchHeader) {

        Long userId = requirePrincipal().getUserId();
        Reservation reservation = adminService.complete(restaurantId, id, userId, parseIfMatch(ifMatchHeader));

        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        return ApiResponse.success(ReservationResponse.from(reservation, timezone), "Reservation completed");
    }

    @PostMapping("/{id}/noshow")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    @Operation(summary = "Mark no-show", description = "Mark reservation as no-show")
    public ApiResponse<ReservationResponse> markNoShow(
            @Parameter(description = "Restaurant ID") @RequestParam @Positive Long restaurantId,
            @Parameter(description = "Reservation ID") @PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestHeader(value = "If-Match", required = true) String ifMatchHeader) {

        Long userId = requirePrincipal().getUserId();
        Reservation reservation = adminService.markNoShow(restaurantId, id, userId, parseIfMatch(ifMatchHeader));

        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        return ApiResponse.success(ReservationResponse.from(reservation, timezone), "Marked as no-show");
    }

    @PostMapping("/{id}/switch")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    @Operation(summary = "Switch tables", description = "Switch the assigned tables for a reservation")
    public ApiResponse<ReservationResponse> switchTables(
            @Parameter(description = "Restaurant ID") @RequestParam @Positive Long restaurantId,
            @Parameter(description = "Reservation ID") @PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestHeader(value = "If-Match", required = true) String ifMatchHeader,
            @Valid @RequestBody SwitchTablesRequest request) {

        Long userId = requirePrincipal().getUserId();
        Reservation reservation = adminService.switchTables(restaurantId, id, request, userId, parseIfMatch(ifMatchHeader));

        Restaurant restaurant = restaurantService.findById(restaurantId);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        return ApiResponse.success(ReservationResponse.from(reservation, timezone), "Tables switched");
    }

    private AuthPrincipal requirePrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthPrincipal principal)) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        return principal;
    }

    private long parseIfMatch(String ifMatch) {
        if (ifMatch == null || ifMatch.isBlank()) {
            throw new PreconditionFailedException("If-Match header is required", "If-Match");
        }
        String normalized = ifMatch.trim();
        if (normalized.startsWith("\"") && normalized.endsWith("\"") && normalized.length() >= 2) {
            normalized = normalized.substring(1, normalized.length() - 1);
        }
        if ("*".equals(normalized)) {
            throw new PreconditionFailedException("Wildcard If-Match is not supported", "If-Match");
        }
        try {
            return Long.parseLong(normalized);
        } catch (NumberFormatException ex) {
            throw new PreconditionFailedException("Invalid If-Match value", "If-Match");
        }
    }
}
