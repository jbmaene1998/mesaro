package com.mesaro.table;

import com.mesaro.common.ApiResponse;
import com.mesaro.infra.TimeService;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.security.RestaurantAccessGuard;
import com.mesaro.availability.TableSelectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(name = "Tables", description = "Dining table management endpoints")
@Validated
public class DiningTableController {

    private final DiningTableService diningTableService;
    private final RestaurantAccessGuard restaurantAccessGuard;
    private final RestaurantService restaurantService;
    private final TableSelectionService tableSelectionService;
    private final TimeService timeService;

    public DiningTableController(
            DiningTableService diningTableService,
            RestaurantAccessGuard restaurantAccessGuard,
            RestaurantService restaurantService,
            TableSelectionService tableSelectionService,
            TimeService timeService) {
        this.diningTableService = diningTableService;
        this.restaurantAccessGuard = restaurantAccessGuard;
        this.restaurantService = restaurantService;
        this.tableSelectionService = tableSelectionService;
        this.timeService = timeService;
    }

    @GetMapping("/restaurants/{id}/tables")
    @Operation(summary = "List tables", description = "List tables for a restaurant")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'STAFF')")
    public ApiResponse<List<DiningTableResponse>> listTables(
            @Parameter(description = "Restaurant ID") @PathVariable Long id) {
        List<DiningTableResponse> tables = diningTableService.findByRestaurant(id).stream()
                .map(DiningTableResponse::from)
                .toList();
        return ApiResponse.success(tables);
    }

    @GetMapping("/restaurants/{id}/tables/status")
    @Operation(summary = "Tables status", description = "Get current status of all tables")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'STAFF')")
    public ApiResponse<List<DiningTableResponse>> tableStatus(
            @Parameter(description = "Restaurant ID") @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime endTime) {
        Restaurant restaurant = restaurantService.findOperationalById(id);
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());
        Integer defaultDurationMinutes = restaurant.getDefaultDurationMinutes();

        Instant startUtc = null;
        Instant endUtc = null;
        if (date != null && startTime != null) {
            startUtc = timeService.toUtc(date, startTime, timezone);
            if (endTime != null) {
                endUtc = timeService.toUtc(date, endTime, timezone);
                // Overnight window: end clock time is earlier than start on the same local date.
                if (!endUtc.isAfter(startUtc)) {
                    endUtc = timeService.toUtc(date.plusDays(1), endTime, timezone);
                }
            } else {
                endUtc = startUtc.plusSeconds(Math.max(1, defaultDurationMinutes) * 60L);
            }
            if (!endUtc.isAfter(startUtc)) {
                endUtc = startUtc.plusSeconds(1);
            }
        }

        Instant finalStartUtc = startUtc;
        Instant finalEndUtc = endUtc;

        List<DiningTableResponse> tables = diningTableService.findByRestaurant(id).stream()
                .map(table -> toTableStatusResponse(table, finalStartUtc, finalEndUtc))
                .toList();
        return ApiResponse.success(tables);
    }

    @PostMapping("/restaurants/{id}/tables")
    @Operation(summary = "Create table", description = "Create a table for a restaurant")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<DiningTableResponse> createTable(
            @Parameter(description = "Restaurant ID") @PathVariable Long id,
            @Valid @RequestBody CreateTableRequest request) {
        DiningTable table = diningTableService.create(id, request);
        return ApiResponse.success(DiningTableResponse.from(table), "Table created");
    }

    @GetMapping("/tables/{id}")
    @Operation(summary = "Get table", description = "Get table details by ID")
    public ApiResponse<DiningTableResponse> getTable(
            @Parameter(description = "Table ID") @PathVariable Long id) {
        DiningTable table = diningTableService.findByIdWithRestaurant(id);
        requireRole(table.getRestaurant().getId(), "STAFF");
        return ApiResponse.success(DiningTableResponse.from(table));
    }

    @PutMapping("/tables/{id}")
    @Operation(summary = "Update table", description = "Update a table by ID")
    public ApiResponse<DiningTableResponse> updateTable(
            @Parameter(description = "Table ID") @PathVariable Long id,
            @Valid @RequestBody UpdateTableRequest request) {
        DiningTable table = diningTableService.findByIdWithRestaurant(id);
        requireRole(table.getRestaurant().getId(), "MANAGER");
        DiningTable updated = diningTableService.update(table.getRestaurant().getId(), id, request);
        return ApiResponse.success(DiningTableResponse.from(updated), "Table updated");
    }

    @DeleteMapping("/tables/{id}")
    @Operation(summary = "Delete table", description = "Delete a table by ID")
    public ApiResponse<Void> deleteTable(
            @Parameter(description = "Table ID") @PathVariable Long id) {
        DiningTable table = diningTableService.findByIdWithRestaurant(id);
        requireRole(table.getRestaurant().getId(), "MANAGER");
        diningTableService.delete(table.getRestaurant().getId(), id);
        return ApiResponse.success(null, "Table deleted");
    }

    private void requireRole(Long restaurantId, String role) {
        if (!restaurantAccessGuard.hasAtLeastRole(restaurantId, role)) {
            throw new AccessDeniedException("Access denied");
        }
    }

    private DiningTableResponse toTableStatusResponse(DiningTable table, Instant startUtc, Instant endUtc) {
        if (startUtc == null || endUtc == null) {
            return DiningTableResponse.from(table, table.getStatus() == TableStatus.AVAILABLE);
        }

        if (table.getStatus() != TableStatus.AVAILABLE) {
            return DiningTableResponse.from(table, false);
        }

        boolean available = tableSelectionService.isTableAvailable(table.getId(), startUtc, endUtc);
        return DiningTableResponse.from(table, available);
    }
}
