package com.mesaro.staff;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AcceptStaffInviteRequest(
        @NotBlank(message = "Invite token is required")
        @Size(max = 512, message = "Invite token is too long")
        String inviteToken,
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
        String password
) {
}
