package com.mesaro.hold;

import com.mesaro.common.ApiResponse;
import com.mesaro.reservation.ConfirmHoldRequest;
import com.mesaro.reservation.ConfirmationResult;
import com.mesaro.reservation.ReservationService;
import com.mesaro.restaurant.Restaurant;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZoneId;

@RestController
@RequestMapping("/api/holds")
@Tag(name = "Holds", description = "Public hold creation and confirmation endpoints")
@Validated
public class HoldController {

    private final HoldService holdService;
    private final ReservationService reservationService;

    public HoldController(HoldService holdService, ReservationService reservationService) {
        this.holdService = holdService;
        this.reservationService = reservationService;
    }

    @PostMapping
    @Operation(summary = "Create hold", description = "Create a 3-minute hold on a table for a time slot")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<HoldResponse> createHold(@Valid @RequestBody CreateHoldRequest request) {
        HoldService.HoldWithToken result = holdService.createHold(request);

        Hold hold = result.hold();
        String token = result.token();
        Restaurant restaurant = hold.getRestaurant();
        ZoneId timezone = ZoneId.of(restaurant.getTimezone());

        return ApiResponse.success(HoldResponse.from(hold, token, timezone), "Hold created successfully");
    }

    @PostMapping("/{token}/confirm")
    @Operation(summary = "Confirm hold", description = "Confirm a hold into a reservation with guest details")
    public ApiResponse<ConfirmationResult> confirmHold(
            @Parameter(description = "Hold token") @PathVariable @NotBlank(message = "Hold token is required") String token,
            @Valid @RequestBody ConfirmHoldRequest request) {

        ConfirmationResult result = reservationService.confirm(token, request);

        return ApiResponse.success(result, "Reservation confirmed");
    }

    @PostMapping("/confirm")
    @Operation(summary = "Confirm hold", description = "Confirm a hold into a reservation with guest details")
    public ApiResponse<ConfirmationResult> confirmHold(@Valid @RequestBody HoldConfirmRequest request) {
        ConfirmHoldRequest confirmRequest = new ConfirmHoldRequest(
                request.guestName(),
                request.guestEmail(),
                request.guestPhone(),
                request.notes()
        );
        ConfirmationResult result = reservationService.confirm(request.holdToken(), confirmRequest);
        return ApiResponse.success(result, "Reservation confirmed");
    }
}
