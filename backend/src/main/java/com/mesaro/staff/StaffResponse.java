package com.mesaro.staff;

import com.mesaro.security.RestaurantRole;
import com.mesaro.user.UserRestaurant;

import java.time.Instant;

public record StaffResponse(
        Long id,
        Long userId,
        String email,
        String name,
        String fullName,
        RestaurantRole role,
        StaffStatus status,
        Instant invitedAt,
        Instant expiresAt,
        Instant lastLoginAt
) {
    public static StaffResponse fromMember(UserRestaurant userRestaurant) {
        return fromMember(userRestaurant, null);
    }

    public static StaffResponse fromMember(UserRestaurant userRestaurant, Instant lastLoginAt) {
        return new StaffResponse(
                userRestaurant.getUser().getId(),
                userRestaurant.getUser().getId(),
                userRestaurant.getUser().getEmail(),
                userRestaurant.getUser().getFullName(),
                userRestaurant.getUser().getFullName(),
                userRestaurant.getRole(),
                StaffStatus.ACTIVE,
                null,
                null,
                lastLoginAt
        );
    }

    public static StaffResponse fromInvite(StaffInvite invite) {
        String inviteName = composeName(invite.getFirstName(), invite.getLastName());
        return new StaffResponse(
                invite.getId(),
                null,
                invite.getEmail(),
                inviteName,
                inviteName,
                invite.getRole(),
                StaffStatus.INVITED,
                invite.getCreatedAtUtc(),
                invite.getExpiresAtUtc(),
                null
        );
    }

    private static String composeName(String firstName, String lastName) {
        String first = firstName == null ? "" : firstName.trim();
        String last = lastName == null ? "" : lastName.trim();
        String full = (first + " " + last).trim();
        return full.isBlank() ? null : full;
    }
}
