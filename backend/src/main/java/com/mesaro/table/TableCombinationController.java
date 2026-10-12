package com.mesaro.table;

import com.mesaro.common.ApiResponse;
import com.mesaro.security.RestaurantAccessGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.AccessDeniedException;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(name = "Table Combinations", description = "Table combination management endpoints")
@Validated
public class TableCombinationController {

    private final TableCombinationService combinationService;
    private final RestaurantAccessGuard restaurantAccessGuard;

    public TableCombinationController(TableCombinationService combinationService,
                                      RestaurantAccessGuard restaurantAccessGuard) {
        this.combinationService = combinationService;
        this.restaurantAccessGuard = restaurantAccessGuard;
    }

    @GetMapping("/restaurants/{id}/combinations")
    @Operation(summary = "List combinations", description = "List table combinations for a restaurant")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'STAFF')")
    public ApiResponse<List<TableCombinationResponse>> listCombinations(
            @Parameter(description = "Restaurant ID") @PathVariable Long id) {
        List<TableCombinationResponse> combinations = combinationService.findByRestaurantWithTables(id).stream()
                .map(TableCombinationResponse::from)
                .toList();
        return ApiResponse.success(combinations);
    }

    @PostMapping("/restaurants/{id}/combinations")
    @Operation(summary = "Create combination", description = "Create a table combination for a restaurant")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TableCombinationResponse> createCombination(
            @Parameter(description = "Restaurant ID") @PathVariable Long id,
            @Valid @RequestBody CreateCombinationRequest request) {
        TableCombination created = combinationService.create(id, request);
        TableCombination loaded = combinationService.findByIdWithRestaurantAndTables(created.getId());
        return ApiResponse.success(TableCombinationResponse.from(loaded), "Combination created");
    }

    @PutMapping("/combinations/{id}")
    @Operation(summary = "Update combination", description = "Update a table combination by ID")
    public ApiResponse<TableCombinationResponse> updateCombination(
            @Parameter(description = "Combination ID") @PathVariable Long id,
            @Valid @RequestBody UpdateCombinationRequest request) {
        TableCombination combination = combinationService.findByIdWithRestaurantAndTables(id);
        requireRole(combination.getRestaurant().getId(), "MANAGER");
        TableCombination updated = combinationService.update(combination.getRestaurant().getId(), id, request);
        TableCombination loaded = combinationService.findByIdWithRestaurantAndTables(updated.getId());
        return ApiResponse.success(TableCombinationResponse.from(loaded), "Combination updated");
    }

    @DeleteMapping("/combinations/{id}")
    @Operation(summary = "Delete combination", description = "Delete a table combination by ID")
    public ApiResponse<Void> deleteCombination(
            @Parameter(description = "Combination ID") @PathVariable Long id) {
        TableCombination combination = combinationService.findByIdWithRestaurantAndTables(id);
        requireRole(combination.getRestaurant().getId(), "MANAGER");
        combinationService.delete(combination.getRestaurant().getId(), id);
        return ApiResponse.success(null, "Combination deleted");
    }

    private void requireRole(Long restaurantId, String role) {
        if (!restaurantAccessGuard.hasAtLeastRole(restaurantId, role)) {
            throw new AccessDeniedException("Access denied");
        }
    }
}
