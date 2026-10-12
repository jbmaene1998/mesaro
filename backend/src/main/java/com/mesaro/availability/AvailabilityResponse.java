package com.mesaro.availability;

import java.time.LocalDate;
import java.util.List;

public record AvailabilityResponse(
        String restaurantSlug,
        String restaurantName,
        String timezone,
        String locale,
        LocalDate date,
        int partySize,
        int minNoticeMinutes,
        int maxAdvanceDays,
        int maxPartySize,
        boolean open,
        String closedReason,
        List<TimeSlot> slots
) {
    public static AvailabilityResponse closed(String slug, String name, String timezone, String locale,
                                              LocalDate date, int partySize,
                                              int minNoticeMinutes, int maxAdvanceDays, int maxPartySize,
                                              String reason) {
        return new AvailabilityResponse(
                slug, name, timezone, locale, date, partySize,
                minNoticeMinutes, maxAdvanceDays, maxPartySize,
                false, reason, List.of()
        );
    }

    public static AvailabilityResponse open(String slug, String name, String timezone, String locale,
                                            LocalDate date, int partySize,
                                            int minNoticeMinutes, int maxAdvanceDays, int maxPartySize,
                                            List<TimeSlot> slots) {
        return new AvailabilityResponse(
                slug, name, timezone, locale, date, partySize,
                minNoticeMinutes, maxAdvanceDays, maxPartySize,
                true, null, slots
        );
    }
}
