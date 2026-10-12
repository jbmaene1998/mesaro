package com.mesaro.auth;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCurrentUserRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email address")
        @Size(max = 255, message = "Email must not exceed 255 characters")
        String email,

        @JsonAlias("name")
        @Size(max = 120, message = "Name must not exceed 120 characters")
        String fullName,

        @Size(max = 30, message = "Phone must not exceed 30 characters")
        String phone
) {
}
