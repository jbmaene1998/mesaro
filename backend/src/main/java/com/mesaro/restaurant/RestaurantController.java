package com.mesaro.restaurant;

import com.mesaro.common.ApiResponse;
import com.mesaro.security.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
@RequestMapping("/api/restaurants")
@Tag(name = "Restaurants", description = "Restaurant listing and details")
@Validated
public class RestaurantController {

    private final RestaurantService restaurantService;

    public RestaurantController(RestaurantService restaurantService) {
        this.restaurantService = restaurantService;
    }

    @GetMapping
    @Operation(summary = "List restaurants", description = "List restaurants for the current user")
    public ApiResponse<List<RestaurantSummaryResponse>> listRestaurants() {
        AuthPrincipal principal = getPrincipal();
        List<Restaurant> restaurants = restaurantService.findByUserId(principal.getUserId());
        List<RestaurantSummaryResponse> response = restaurants.stream()
                .map(RestaurantSummaryResponse::from)
                .toList();
        return ApiResponse.success(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get restaurant", description = "Get restaurant details by ID")
    public ApiResponse<RestaurantSummaryResponse> getRestaurant(
            @Parameter(description = "Restaurant ID") @PathVariable Long id) {
        Restaurant restaurant = restaurantService.findByIdWithAccess(id);
        return ApiResponse.success(RestaurantSummaryResponse.from(restaurant));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create restaurant", description = "Create a new restaurant and attach current user as OWNER")
    public ApiResponse<RestaurantSummaryResponse> createRestaurant(@Valid @RequestBody CreateRestaurantRequest request) {
        AuthPrincipal principal = getPrincipal();
        Restaurant restaurant = restaurantService.createForOwner(principal.getUserId(), request);
        return ApiResponse.success(RestaurantSummaryResponse.from(restaurant), "Restaurant created");
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Archive restaurant", description = "Soft-delete (archive) a restaurant. Only the OWNER may archive.")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'OWNER')")
    public ApiResponse<RestaurantSummaryResponse> archiveRestaurant(
            @Parameter(description = "Restaurant ID") @PathVariable Long id) {
        Restaurant restaurant = restaurantService.archive(id);
        return ApiResponse.success(RestaurantSummaryResponse.from(restaurant), "Restaurant archived");
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update restaurant", description = "Update restaurant settings by ID")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'OWNER')")
    public ApiResponse<RestaurantSummaryResponse> updateRestaurant(
            @Parameter(description = "Restaurant ID") @PathVariable Long id,
            @Valid @RequestBody UpdateRestaurantRequest request) {
        Restaurant restaurant = restaurantService.update(id, request);
        return ApiResponse.success(RestaurantSummaryResponse.from(restaurant), "Restaurant updated");
    }

    @GetMapping("/{id}/opening-hours")
    @Operation(summary = "Get opening hours", description = "Get opening hours for all weekdays")
    public ApiResponse<List<OpeningHoursResponse>> getOpeningHours(
            @Parameter(description = "Restaurant ID") @PathVariable Long id) {
        List<OpeningHoursResponse> response = toOpeningHoursResponse(restaurantService.findOpeningHoursWithAccess(id));
        return ApiResponse.success(response);
    }

    @PutMapping("/{id}/opening-hours")
    @Operation(summary = "Update opening hours", description = "Replace opening hours for all weekdays")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#id, 'OWNER')")
    public ApiResponse<List<OpeningHoursResponse>> updateOpeningHours(
            @Parameter(description = "Restaurant ID") @PathVariable Long id,
            @Valid @RequestBody List<UpdateOpeningHoursDayRequest> days) {
        List<OpeningHoursResponse> response = toOpeningHoursResponse(restaurantService.updateOpeningHours(id, days));
        return ApiResponse.success(response, "Opening hours updated");
    }

    private List<OpeningHoursResponse> toOpeningHoursResponse(List<com.mesaro.openinghours.OpeningHours> openingHours) {
        java.util.Map<Integer, com.mesaro.openinghours.OpeningHours> byDay = openingHours.stream()
                .collect(java.util.stream.Collectors.toMap(com.mesaro.openinghours.OpeningHours::getDayOfWeek, value -> value));
        java.util.List<OpeningHoursResponse> rows = new java.util.ArrayList<>();
        for (int day = 1; day <= 7; day++) {
            com.mesaro.openinghours.OpeningHours current = byDay.get(day);
            rows.add(current != null ? OpeningHoursResponse.from(current) : OpeningHoursResponse.closed(day));
        }
        return rows;
    }

    private AuthPrincipal getPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthPrincipal principal)) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        return principal;
    }
}
