package com.mesaro.auth;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        long expiresIn
) {
}
