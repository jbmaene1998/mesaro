package com.mesaro.auth;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email address")
        @Size(max = 255, message = "Email must not exceed 255 characters")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
        String password,

        @JsonAlias("name")
        @Size(max = 120, message = "Owner name must not exceed 120 characters")
        String ownerName,

        @Size(max = 30, message = "Owner phone must not exceed 30 characters")
        String ownerPhone
) {}
