package com.mesaro.reservation;

import com.mesaro.common.ApiResponse;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZoneId;

@RestController
@RequestMapping("/api/reservations")
@Tag(name = "Reservations", description = "Public reservation endpoints for guests")
@Validated
public class ReservationController {

    private final ReservationService reservationService;
    private final RestaurantService restaurantService;

    public ReservationController(ReservationService reservationService, RestaurantService restaurantService) {
        this.reservationService = reservationService;
        this.restaurantService = restaurantService;
    }

    @GetMapping("/{code}")
    @Operation(summary = "Get reservation", description = "Get reservation details by confirmation code")
    public ApiResponse<PublicReservationResponse> getByConfirmationCode(
            @Parameter(description = "Confirmation code") @PathVariable @NotBlank(message = "Confirmation code is required") String code,
            @Parameter(description = "Cancel token") @RequestParam(required = false) String cancelToken,
            @RequestHeader(value = "X-Cancel-Token", required = false) String cancelTokenHeader) {
        String resolvedCancelToken = resolveCancelToken(cancelToken, cancelTokenHeader);

        Reservation reservation = reservationService.findByCodeAndCancelToken(code, resolvedCancelToken);

        Restaurant restaurant = reservation.getRestaurant();
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        return ApiResponse.success(PublicReservationResponse.from(reservation, timezone));
    }

    @PostMapping("/{code}/cancel")
    @Operation(summary = "Cancel reservation", description = "Cancel a reservation using the cancel token")
    public ApiResponse<PublicReservationResponse> cancelByToken(
            @Parameter(description = "Confirmation code") @PathVariable @NotBlank(message = "Confirmation code is required") String code,
            @Parameter(description = "Cancel token") @RequestParam(required = false) String cancelToken,
            @RequestHeader(value = "X-Cancel-Token", required = false) String cancelTokenHeader) {
        String resolvedCancelToken = resolveCancelToken(cancelToken, cancelTokenHeader);

        Reservation reservation = reservationService.cancelByCodeAndToken(code, resolvedCancelToken);

        Restaurant restaurant = reservation.getRestaurant();
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        return ApiResponse.success(PublicReservationResponse.from(reservation, timezone), "Reservation cancelled");
    }

    private String resolveCancelToken(String cancelToken, String cancelTokenHeader) {
        String header = cancelTokenHeader == null ? "" : cancelTokenHeader.trim();
        if (!header.isEmpty()) {
            return header;
        }
        String query = cancelToken == null ? "" : cancelToken.trim();
        if (!query.isEmpty()) {
            return query;
        }
        throw new com.mesaro.common.exception.ValidationException("Cancel token is required", "cancelToken");
    }
}
