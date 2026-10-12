package com.mesaro.dashboard;

import java.time.Instant;
import java.util.List;

public record LiveServiceViewResponse(
        Long restaurantId,
        String restaurantName,
        String timezone,
        Instant generatedAt,
        List<LiveServiceTableStatus> tables
) {
}
