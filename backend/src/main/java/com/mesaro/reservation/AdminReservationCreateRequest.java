package com.mesaro.reservation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record AdminReservationCreateRequest(
        @NotNull(message = "Date is required")
        LocalDate date,

        @NotNull(message = "Time is required")
        LocalTime time,

        Integer utcOffsetMinutes,

        @NotNull(message = "Party size is required")
        @Min(value = 1, message = "Party size must be at least 1")
        @Max(value = 20, message = "Party size must not exceed 20")
        Integer partySize,

        @NotBlank(message = "Guest name is required")
        @Size(max = 100, message = "Guest name must not exceed 100 characters")
        String guestName,

        @Email(message = "Invalid email format")
        @Size(max = 255, message = "Guest email must not exceed 255 characters")
        String guestEmail,

        @Size(max = 30, message = "Guest phone must not exceed 30 characters")
        String guestPhone,

        @Size(max = 500, message = "Notes must not exceed 500 characters")
        String notes,

        @Min(value = 30, message = "Duration must be at least 30 minutes")
        @Max(value = 360, message = "Duration must not exceed 360 minutes")
        Integer durationMinutes,

        List<Long> tableIds,

        Long combinationId,

        Boolean seatImmediately
) {
    public AdminReservationCreateRequest(LocalDate date,
                                         LocalTime time,
                                         Integer partySize,
                                         String guestName,
                                         String guestEmail,
                                         String guestPhone,
                                         String notes,
                                         Integer durationMinutes,
                                         List<Long> tableIds,
                                         Long combinationId,
                                         Boolean seatImmediately) {
        this(
                date,
                time,
                null,
                partySize,
                guestName,
                guestEmail,
                guestPhone,
                notes,
                durationMinutes,
                tableIds,
                combinationId,
                seatImmediately
        );
    }
}
