package com.mesaro.hold;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record HoldConfirmRequest(
        @NotBlank(message = "Hold token is required")
        String holdToken,

        @NotBlank(message = "Guest name is required")
        @Size(max = 100, message = "Guest name must not exceed 100 characters")
        String guestName,

        @NotBlank(message = "Guest email is required")
        @Email(message = "Invalid email format")
        @Size(max = 255, message = "Guest email must not exceed 255 characters")
        String guestEmail,

        @Size(max = 30, message = "Guest phone must not exceed 30 characters")
        String guestPhone,

        @Size(max = 500, message = "Notes must not exceed 500 characters")
        String notes
) {
}
