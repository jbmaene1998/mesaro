package com.mesaro.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Reset token is required")
        @Size(max = 512, message = "Reset token is too long")
        String token,
        @NotBlank(message = "New password is required")
        @Size(max = 255, message = "New password is too long")
        String newPassword
) {
}
