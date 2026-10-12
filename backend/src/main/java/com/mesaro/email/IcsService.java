package com.mesaro.email;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Service for generating RFC5545 ICS calendar files.
 */
@Service
public class IcsService {

    private static final DateTimeFormatter ICS_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");
    private static final String CRLF = "\r\n";

    /**
     * Generate an ICS calendar file for a reservation.
     *
     * @param uid           Unique identifier for the event (e.g., confirmation code)
     * @param summary       Event summary/title
     * @param description   Event description
     * @param location      Event location (restaurant name)
     * @param startUtc      Start time in UTC
     * @param endUtc        End time in UTC
     * @param timezone      Timezone for display
     * @param organizerEmail Organizer email address
     * @return ICS file content as bytes
     */
    public byte[] generateReservationIcs(
            String uid,
            String summary,
            String description,
            String location,
            Instant startUtc,
            Instant endUtc,
            ZoneId timezone,
            String organizerEmail) {

        String dtStart = formatDateTime(startUtc, timezone);
        String dtEnd = formatDateTime(endUtc, timezone);
        String dtstamp = formatDateTimeUtc(Instant.now());
        String tzid = timezone.getId();

        StringBuilder ics = new StringBuilder();
        ics.append("BEGIN:VCALENDAR").append(CRLF);
        ics.append("VERSION:2.0").append(CRLF);
        ics.append("PRODID:-//Mesaro//Reservation System//EN").append(CRLF);
        ics.append("CALSCALE:GREGORIAN").append(CRLF);
        ics.append("METHOD:PUBLISH").append(CRLF);

        // Timezone definition
        ics.append("BEGIN:VTIMEZONE").append(CRLF);
        ics.append("TZID:").append(tzid).append(CRLF);
        ics.append("END:VTIMEZONE").append(CRLF);

        // Event
        ics.append("BEGIN:VEVENT").append(CRLF);
        ics.append("UID:").append(escapeIcsText(uid)).append("@mesaro.com").append(CRLF);
        ics.append("DTSTAMP:").append(dtstamp).append(CRLF);
        ics.append("DTSTART;TZID=").append(tzid).append(":").append(dtStart).append(CRLF);
        ics.append("DTEND;TZID=").append(tzid).append(":").append(dtEnd).append(CRLF);
        ics.append("SUMMARY:").append(escapeIcsText(summary)).append(CRLF);

        if (description != null && !description.isEmpty()) {
            ics.append("DESCRIPTION:").append(escapeIcsText(description)).append(CRLF);
        }

        if (location != null && !location.isEmpty()) {
            ics.append("LOCATION:").append(escapeIcsText(location)).append(CRLF);
        }

        if (organizerEmail != null && !organizerEmail.isEmpty()) {
            ics.append("ORGANIZER:mailto:").append(organizerEmail).append(CRLF);
        }

        ics.append("STATUS:CONFIRMED").append(CRLF);
        ics.append("TRANSP:OPAQUE").append(CRLF);
        ics.append("END:VEVENT").append(CRLF);
        ics.append("END:VCALENDAR").append(CRLF);

        return ics.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String formatDateTime(Instant instant, ZoneId timezone) {
        return instant.atZone(timezone).format(ICS_DATE_FORMAT);
    }

    private String formatDateTimeUtc(Instant instant) {
        return instant.atZone(ZoneId.of("UTC")).format(ICS_DATE_FORMAT) + "Z";
    }

    /**
     * Escape special characters in ICS text fields.
     * Per RFC5545: backslash, semicolon, and comma must be escaped.
     * Newlines become \n.
     */
    private String escapeIcsText(String text) {
        if (text == null) {
            return "";
        }
        return text
                .replace("\\", "\\\\")
                .replace(";", "\\;")
                .replace(",", "\\,")
                .replace("\n", "\\n")
                .replace("\r", "");
    }
}
