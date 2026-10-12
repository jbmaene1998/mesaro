package com.mesaro.staff;

import com.mesaro.security.RestaurantRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InviteStaffRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        @Size(max = 255, message = "Email must not exceed 255 characters")
        String email,

        @NotBlank(message = "First name is required")
        @Size(max = 60, message = "First name must not exceed 60 characters")
        String firstName,

        @NotBlank(message = "Last name is required")
        @Size(max = 60, message = "Last name must not exceed 60 characters")
        String lastName,

        @NotNull(message = "Role is required")
        RestaurantRole role
) {
}
