package com.mesaro.auth;

public record RegisterResponse(
        String email,
        boolean verificationRequired
) {
}
