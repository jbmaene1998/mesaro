package com.mesaro.reservation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AdminReservationUpdateRequest(
        @Size(max = 100, message = "Guest name must not exceed 100 characters")
        String guestName,

        @Email(message = "Invalid email format")
        @Size(max = 255, message = "Guest email must not exceed 255 characters")
        String guestEmail,

        @Size(max = 30, message = "Guest phone must not exceed 30 characters")
        String guestPhone,

        @Size(max = 500, message = "Notes must not exceed 500 characters")
        String notes,

        List<Long> tableIds,

        Long combinationId
) {
}
