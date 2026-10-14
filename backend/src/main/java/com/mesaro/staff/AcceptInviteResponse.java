package com.mesaro.staff;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AcceptInviteResponse(
        boolean verificationRequired,
        String email,
        String accessToken,
        String refreshToken,
        Long expiresIn
) {
    public static AcceptInviteResponse pending(String email) {
        return new AcceptInviteResponse(true, email, null, null, null);
    }

    public static AcceptInviteResponse session(String email, String accessToken, String refreshToken, long expiresIn) {
        return new AcceptInviteResponse(false, email, accessToken, refreshToken, expiresIn);
    }
}
