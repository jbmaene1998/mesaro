package com.mesaro.restaurant;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateRestaurantRequest(
        @Size(max = 100, message = "Name must not exceed 100 characters")
        String name,

        @Size(max = 60, message = "Slug must not exceed 60 characters")
        @Pattern(regexp = "^[a-z0-9-]{3,60}$", message = "Slug must match [a-z0-9-]{3,60}")
        String slug,

        @Size(max = 50, message = "Timezone must not exceed 50 characters")
        String timezone,

        @Pattern(regexp = "^[a-z]{2}(-[A-Z]{2})?$", message = "Locale must be in format en or en-US")
        String locale,

        Boolean bookingEnabled,

        @Min(value = 5, message = "Slot interval must be at least 5 minutes")
        @Max(value = 60, message = "Slot interval must not exceed 60 minutes")
        Integer slotIntervalMinutes,

        @Min(value = 15, message = "Default duration must be at least 15 minutes")
        @Max(value = 480, message = "Default duration must not exceed 480 minutes")
        Integer defaultDurationMinutes,

        @Min(value = 0, message = "Minimum notice must not be negative")
        @Max(value = 1440, message = "Minimum notice must not exceed 1440 minutes")
        Integer minNoticeMinutes,

        @Min(value = 1, message = "Max advance days must be at least 1")
        @Max(value = 365, message = "Max advance days must not exceed 365")
        Integer maxAdvanceDays,

        @Min(value = 1, message = "Max party size must be at least 1")
        @Max(value = 200, message = "Max party size must not exceed 200")
        Integer maxPartySize,

        AssignmentMode assignmentMode
) {
}
