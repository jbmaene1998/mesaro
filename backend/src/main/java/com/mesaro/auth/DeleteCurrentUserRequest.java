package com.mesaro.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeleteCurrentUserRequest(
        @NotBlank(message = "Password is required")
        @Size(max = 72, message = "Password must not exceed 72 characters")
        String password,

        @NotBlank(message = "Confirmation is required")
        @Size(max = 32, message = "Confirmation must not exceed 32 characters")
        String confirmPhrase
) {
}
