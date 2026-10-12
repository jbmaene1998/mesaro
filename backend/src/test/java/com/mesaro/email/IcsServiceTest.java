package com.mesaro.email;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.*;

class IcsServiceTest {

    private IcsService icsService;

    @BeforeEach
    void setUp() {
        icsService = new IcsService();
    }

    @Test
    void generateReservationIcs_containsRequiredFields() {
        // Given
        String uid = "RES-2024-000001";
        String summary = "Reservation at Test Restaurant";
        String description = "Reservation for 4 guests";
        String location = "Test Restaurant";
        Instant startUtc = Instant.parse("2024-12-15T18:00:00Z");
        Instant endUtc = Instant.parse("2024-12-15T20:00:00Z");
        ZoneId timezone = ZoneId.of("Europe/Brussels");
        String organizerEmail = "noreply@mesaro.com";

        // When
        byte[] icsBytes = icsService.generateReservationIcs(
                uid, summary, description, location, startUtc, endUtc, timezone, organizerEmail);
        String icsContent = new String(icsBytes, StandardCharsets.UTF_8);

        // Then
        assertTrue(icsContent.contains("BEGIN:VCALENDAR"), "Should contain VCALENDAR begin");
        assertTrue(icsContent.contains("END:VCALENDAR"), "Should contain VCALENDAR end");
        assertTrue(icsContent.contains("BEGIN:VEVENT"), "Should contain VEVENT begin");
        assertTrue(icsContent.contains("END:VEVENT"), "Should contain VEVENT end");

        // Required fields per RFC5545
        assertTrue(icsContent.contains("UID:" + uid + "@mesaro.com"), "Should contain UID");
        assertTrue(icsContent.contains("DTSTART;TZID=Europe/Brussels:"), "Should contain DTSTART with timezone");
        assertTrue(icsContent.contains("DTEND;TZID=Europe/Brussels:"), "Should contain DTEND with timezone");
        assertTrue(icsContent.contains("DTSTAMP:"), "Should contain DTSTAMP");

        // Optional but expected fields
        assertTrue(icsContent.contains("SUMMARY:" + summary.replace(",", "\\,")), "Should contain SUMMARY");
        assertTrue(icsContent.contains("LOCATION:Test Restaurant"), "Should contain LOCATION");
        assertTrue(icsContent.contains("ORGANIZER:mailto:" + organizerEmail), "Should contain ORGANIZER");
    }

    @Test
    void generateReservationIcs_formatsDateTimeCorrectly() {
        // Given - 6 PM UTC on Dec 15 = 7 PM Brussels time (CET = UTC+1)
        Instant startUtc = Instant.parse("2024-12-15T18:00:00Z");
        Instant endUtc = Instant.parse("2024-12-15T20:00:00Z");
        ZoneId timezone = ZoneId.of("Europe/Brussels");

        // When
        byte[] icsBytes = icsService.generateReservationIcs(
                "TEST-001", "Test", null, null, startUtc, endUtc, timezone, null);
        String icsContent = new String(icsBytes, StandardCharsets.UTF_8);

        // Then - Brussels is UTC+1 in winter
        assertTrue(icsContent.contains("DTSTART;TZID=Europe/Brussels:20241215T190000"),
                "DTSTART should be 19:00 local time");
        assertTrue(icsContent.contains("DTEND;TZID=Europe/Brussels:20241215T210000"),
                "DTEND should be 21:00 local time");
    }

    @Test
    void generateReservationIcs_escapesSpecialCharacters() {
        // Given
        String summary = "Dinner, Party; Celebration";
        String description = "Line 1\nLine 2";

        // When
        byte[] icsBytes = icsService.generateReservationIcs(
                "TEST-002", summary, description, null,
                Instant.now(), Instant.now().plusSeconds(3600),
                ZoneId.of("UTC"), null);
        String icsContent = new String(icsBytes, StandardCharsets.UTF_8);

        // Then
        assertTrue(icsContent.contains("SUMMARY:Dinner\\, Party\\; Celebration"),
                "Should escape comma and semicolon");
        assertTrue(icsContent.contains("DESCRIPTION:Line 1\\nLine 2"),
                "Should escape newlines");
    }

    @Test
    void generateReservationIcs_handlesNullOptionalFields() {
        // Given
        Instant startUtc = Instant.now();
        Instant endUtc = startUtc.plusSeconds(3600);

        // When
        byte[] icsBytes = icsService.generateReservationIcs(
                "TEST-003", "Reservation", null, null, startUtc, endUtc, ZoneId.of("UTC"), null);
        String icsContent = new String(icsBytes, StandardCharsets.UTF_8);

        // Then - should not throw and should contain required fields
        assertTrue(icsContent.contains("UID:TEST-003@mesaro.com"));
        assertTrue(icsContent.contains("DTSTART;"));
        assertTrue(icsContent.contains("DTEND;"));
        assertFalse(icsContent.contains("DESCRIPTION:"), "Should not contain empty DESCRIPTION");
        assertFalse(icsContent.contains("LOCATION:"), "Should not contain empty LOCATION");
        assertFalse(icsContent.contains("ORGANIZER:"), "Should not contain empty ORGANIZER");
    }

    @Test
    void generateReservationIcs_usesCorrectLineEndings() {
        // Given
        byte[] icsBytes = icsService.generateReservationIcs(
                "TEST-004", "Test", null, null,
                Instant.now(), Instant.now().plusSeconds(3600),
                ZoneId.of("UTC"), null);
        String icsContent = new String(icsBytes, StandardCharsets.UTF_8);

        // Then - RFC5545 requires CRLF line endings
        assertTrue(icsContent.contains("\r\n"), "Should use CRLF line endings");
        assertFalse(icsContent.contains("\r\n\r\n"), "Should not have blank lines between fields");
    }
}
