package com.mesaro.email;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

/**
 * Data required to send a reservation confirmation email.
 */
public record ReservationEmailData(
        String confirmationCode,
        String guestName,
        String guestEmail,
        int partySize,
        Instant startAtUtc,
        Instant endAtUtc,
        String timezone,
        String restaurantName,
        String restaurantSlug,
        List<String> tableLabels,
        String cancelToken
) {
    public ZoneId getTimezoneId() {
        return ZoneId.of(timezone);
    }
}
