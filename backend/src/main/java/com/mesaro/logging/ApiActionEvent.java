package com.mesaro.logging;

import java.time.Instant;

public record ApiActionEvent(
        Instant timestamp,
        String environment,
        String action,
        String method,
        String path,
        int status,
        long durationMs,
        boolean success,
        String correlationId,
        String requestId,
        String clientIp,
        Long userId,
        String userEmail,
        Long restaurantId,
        String restaurantRole
) {
}
