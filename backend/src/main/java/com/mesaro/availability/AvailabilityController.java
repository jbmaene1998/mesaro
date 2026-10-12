package com.mesaro.availability;

import com.mesaro.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/availability")
@Tag(name = "Availability", description = "Public availability check endpoints")
@Validated
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

    @GetMapping
    @Operation(summary = "Check availability", description = "Check available time slots for a date and party size")
    public ApiResponse<AvailabilityResponse> checkAvailability(
            @Parameter(description = "Restaurant slug", required = true)
            @RequestParam @NotBlank(message = "Restaurant slug is required") String restaurantSlug,
            @Parameter(description = "Date to check", required = true)
            @RequestParam @NotNull(message = "Date is required") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Parameter(description = "Number of guests", required = true)
            @RequestParam @NotNull(message = "Party size is required")
            @Min(value = 1, message = "Party size must be at least 1")
            Integer partySize) {

        AvailabilityRequest request = new AvailabilityRequest(restaurantSlug, date, partySize);
        AvailabilityResponse response = availabilityService.checkAvailability(request);

        return ApiResponse.success(response);
    }

    @GetMapping("/closed")
    @Operation(summary = "Check if closed", description = "Check if restaurant is closed on a date")
    public ApiResponse<ClosedCheckResponse> checkClosed(
            @Parameter(description = "Restaurant slug", required = true)
            @RequestParam @NotBlank(message = "Restaurant slug is required") String restaurantSlug,
            @Parameter(description = "Date to check", required = true)
            @RequestParam @NotNull(message = "Date is required") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        boolean closed = availabilityService.isRestaurantClosed(restaurantSlug, date);
        String closedReason = closed ? availabilityService.getClosedReason(restaurantSlug, date) : null;

        return ApiResponse.success(new ClosedCheckResponse(restaurantSlug, date, closed, closedReason));
    }

    public record ClosedCheckResponse(String restaurantSlug, LocalDate date, boolean closed, String closedReason) {}
}
