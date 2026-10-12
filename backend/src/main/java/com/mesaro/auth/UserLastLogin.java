package com.mesaro.auth;

import java.time.Instant;

public record UserLastLogin(
        Long userId,
        Instant lastLoginAt
) {
}
