package com.mesaro.staff;

import com.mesaro.security.RestaurantRole;

import java.time.Instant;

public record StaffInviteResponse(
        Long id,
        String email,
        RestaurantRole role,
        Instant expiresAt
) {
    public static StaffInviteResponse from(StaffInvite invite) {
        return new StaffInviteResponse(
                invite.getId(),
                invite.getEmail(),
                invite.getRole(),
                invite.getExpiresAtUtc()
        );
    }
}
