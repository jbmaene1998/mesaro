package com.mesaro.infra;

import com.mesaro.availability.DstResult;
import com.mesaro.common.exception.UnprocessableEntityException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.zone.ZoneOffsetTransition;
import java.util.List;

@Service
public class TimeService {

    private static final Logger log = LoggerFactory.getLogger(TimeService.class);

    /**
     * Validates and converts a local time to UTC, handling DST transitions.
     *
     * @param date     The local date
     * @param time     The local time
     * @param timezone The IANA timezone
     * @return DstResult indicating validity and UTC instant
     */
    public DstResult validateAndConvertToUtc(LocalDate date, LocalTime time, ZoneId timezone) {
        LocalDateTime localDateTime = LocalDateTime.of(date, time);

        // Check for DST gap (time doesn't exist)
        ZoneOffsetTransition transition = timezone.getRules().getTransition(localDateTime);

        if (transition != null && transition.isGap()) {
            log.debug("DST gap detected for {} {} in {}", date, time, timezone);
            return new DstResult.Gap(time);
        }

        ZonedDateTime zonedDateTime = localDateTime.atZone(timezone);

        // Check for DST overlap (ambiguous time)
        if (transition != null && transition.isOverlap()) {
            // Use earlier offset by convention (consistent behavior)
            ZonedDateTime withEarlierOffset = zonedDateTime.withEarlierOffsetAtOverlap();
            Instant utcInstant = withEarlierOffset.toInstant();
            String note = String.format("Ambiguous time due to DST, using earlier offset (%s)",
                    withEarlierOffset.getOffset());
            log.debug("DST overlap at {} {} in {}: {}", date, time, timezone, note);
            return new DstResult.Overlap(time, utcInstant, note);
        }

        return new DstResult.Valid(time, zonedDateTime.toInstant());
    }

    /**
     * Converts a local datetime to UTC instant.
     */
    public Instant toUtc(LocalDate date, LocalTime time, ZoneId timezone) {
        return LocalDateTime.of(date, time).atZone(timezone).toInstant();
    }

    /**
     * DST-safe local datetime conversion:
     * - rejects non-existent gap times with 422
     * - requires utcOffsetMinutes for overlap times
     */
    public Instant toUtcStrict(LocalDate date, LocalTime time, ZoneId timezone, Integer utcOffsetMinutes) {
        LocalDateTime localDateTime = LocalDateTime.of(date, time);
        List<ZoneOffset> offsets = timezone.getRules().getValidOffsets(localDateTime);

        if (offsets.isEmpty()) {
            throw new UnprocessableEntityException(
                    "The requested time does not exist due to a daylight saving time transition.",
                    "time"
            );
        }

        if (offsets.size() > 1) {
            // Match AvailabilityService: default to earlier offset when client omits disambiguation.
            ZoneOffset requested;
            if (utcOffsetMinutes == null) {
                requested = offsets.stream()
                        .min(ZoneOffset::compareTo)
                        .orElse(offsets.get(0));
                log.debug("DST overlap at {} {} in {}: defaulting to earlier offset {}",
                        date, time, timezone, requested);
            } else {
                requested = ZoneOffset.ofTotalSeconds(utcOffsetMinutes * 60);
                if (!offsets.contains(requested)) {
                    throw new UnprocessableEntityException(
                            "Provided utcOffsetMinutes does not match the requested local time in this timezone.",
                            "utcOffsetMinutes"
                    );
                }
            }
            return ZonedDateTime.ofStrict(localDateTime, requested, timezone).toInstant();
        }

        ZoneOffset resolved = offsets.get(0);
        if (utcOffsetMinutes != null && resolved.getTotalSeconds() != utcOffsetMinutes * 60) {
            throw new UnprocessableEntityException(
                    "Provided utcOffsetMinutes does not match the requested local time in this timezone.",
                    "utcOffsetMinutes"
            );
        }
        return ZonedDateTime.ofStrict(localDateTime, resolved, timezone).toInstant();
    }

    /**
     * Converts a UTC instant to local time in the given timezone.
     */
    public LocalTime toLocalTime(Instant utc, ZoneId timezone) {
        return utc.atZone(timezone).toLocalTime();
    }

    /**
     * Converts a UTC instant to local date in the given timezone.
     */
    public LocalDate toLocalDate(Instant utc, ZoneId timezone) {
        return utc.atZone(timezone).toLocalDate();
    }

    /**
     * Converts a UTC instant to local datetime in the given timezone.
     */
    public LocalDateTime toLocalDateTime(Instant utc, ZoneId timezone) {
        return utc.atZone(timezone).toLocalDateTime();
    }

    /**
     * Gets the current time in UTC.
     */
    public Instant now() {
        return Instant.now();
    }

    /**
     * Gets today's date in the given timezone.
     */
    public LocalDate today(ZoneId timezone) {
        return LocalDate.now(timezone);
    }
}
