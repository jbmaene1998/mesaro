package com.mesaro.contact;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContactRequest(
        @Size(max = 120, message = "Name must not exceed 120 characters")
        String name,

        @Size(max = 60, message = "First name must not exceed 60 characters")
        String firstName,

        @Size(max = 60, message = "Last name must not exceed 60 characters")
        String lastName,

        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email address")
        @Size(max = 255, message = "Email must not exceed 255 characters")
        String email,

        @NotBlank(message = "Message is required")
        @Size(max = 4000, message = "Message must not exceed 4000 characters")
        String message,

        @Size(max = 160, message = "Restaurant name must not exceed 160 characters")
        String restaurantName,

        /** Honeypot — must stay empty. Filled by bots. */
        @Size(max = 120, message = "Invalid field")
        String companyWebsite
) {
}
