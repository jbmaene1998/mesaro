package com.mesaro.email.layout;

import com.mesaro.email.ReservationEmailData;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;

/**
 * Builds plain-text and HTML bodies for guest reservation emails.
 */
public final class ReservationEmailComposer {

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter TIME_FORMAT =
            DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH);
    private static final DateTimeFormatter REMINDER_FORMAT =
            DateTimeFormatter.ofPattern("EEEE, MMM d 'at' HH:mm", Locale.ENGLISH);

    private ReservationEmailComposer() {
    }

    public record ComposedEmail(String subject, String plainBody, EmailDocument document) {
    }

    public static ComposedEmail confirmation(ReservationEmailData data, String frontendUrl) {
        String date = data.startAtUtc().atZone(data.getTimezoneId()).format(DATE_FORMAT);
        String time = data.startAtUtc().atZone(data.getTimezoneId()).format(TIME_FORMAT);
        String cancelUrl = buildCancelUrl(frontendUrl, data);
        String subject = String.format("Reservation Confirmed - %s (%s)",
                data.restaurantName(), data.confirmationCode());

        LinkedHashMap<String, String> rows = new LinkedHashMap<>();
        rows.put("Confirmation", data.confirmationCode());
        rows.put("Restaurant", data.restaurantName());
        rows.put("Date", date);
        rows.put("Time", time);
        rows.put("Party size", data.partySize() + (data.partySize() == 1 ? " guest" : " guests"));

        String bodyHtml = EmailBlocks.paragraph(
                "Hi <strong>" + EmailBlocks.escape(data.guestName()) + "</strong>, your reservation is confirmed.")
                + EmailBlocks.detailRows(rows)
                + EmailBlocks.mutedNote(
                "Please arrive on time. Your table will be held for 15 minutes after your reservation time. "
                        + "A calendar invite (.ics) is attached.")
                + (cancelUrl != null
                ? EmailBlocks.mutedNote("Need to cancel? Use the button below. The cancellation link expires 7 days after booking.")
                : "");

        String plainBody = String.format("""
                Dear %s,

                Your reservation has been confirmed!

                Confirmation Code: %s
                Restaurant: %s
                Date: %s
                Time: %s
                Party Size: %d guests

                Please arrive on time. Your table will be held for 15 minutes after your reservation time.
                A calendar invite (.ics) is attached to this email.
                %s
                We look forward to seeing you!

                Best regards,
                %s
                """,
                data.guestName(),
                data.confirmationCode(),
                data.restaurantName(),
                date,
                time,
                data.partySize(),
                cancelUrl == null
                        ? ""
                        : "\nNEED TO CANCEL?\n" + cancelUrl + "\n\nThis cancellation link expires 7 days after booking.\n",
                data.restaurantName()
        );

        EmailDocument document = new EmailDocument(
                "Reservation confirmed",
                "Your booking at " + data.restaurantName() + " is secured",
                null,
                bodyHtml,
                cancelUrl == null ? null : "Cancel reservation",
                cancelUrl,
                EmailTone.GUEST
        );
        return new ComposedEmail(subject, plainBody, document);
    }

    public static ComposedEmail reminder(String guestName,
                                         String restaurantName,
                                         String confirmationCode,
                                         int partySize,
                                         String localDateTime,
                                         String timezoneId) {
        String subject = "Reminder: your reservation at " + restaurantName;

        LinkedHashMap<String, String> rows = new LinkedHashMap<>();
        rows.put("Confirmation", confirmationCode);
        rows.put("Restaurant", restaurantName);
        rows.put("When", localDateTime + " (" + timezoneId + ")");
        rows.put("Party size", partySize + (partySize == 1 ? " guest" : " guests"));

        String bodyHtml = EmailBlocks.paragraph(
                "Hi <strong>" + EmailBlocks.escape(guestName) + "</strong>, this is a reminder for your upcoming reservation.")
                + EmailBlocks.detailRows(rows)
                + EmailBlocks.mutedNote(
                "If you need to cancel, use the cancellation link from your confirmation email.");

        String plainBody = String.format("""
                Hi %s,

                This is a reminder for your upcoming reservation at %s.

                Confirmation code: %s
                Party size: %d
                Date and time: %s (%s)

                If you need to cancel, use your cancellation link from the confirmation email.
                """,
                guestName, restaurantName, confirmationCode, partySize, localDateTime, timezoneId);

        EmailDocument document = EmailDocument.of(
                "Upcoming reservation",
                "Your booking at " + restaurantName + " starts soon",
                bodyHtml,
                null,
                null,
                EmailTone.GUEST
        );
        return new ComposedEmail(subject, plainBody, document);
    }

    public static String formatReminderLocalTime(java.time.Instant startAtUtc, java.time.ZoneId timezone) {
        return startAtUtc.atZone(timezone).format(REMINDER_FORMAT);
    }

    public static String bookingPageUrl(String frontendUrl, String restaurantSlug) {
        String base = EmailLayout.trimTrailingSlash(frontendUrl);
        if (restaurantSlug == null || restaurantSlug.isBlank()) {
            return base;
        }
        return base + "/r/" + restaurantSlug.trim();
    }

    private static String buildCancelUrl(String frontendUrl, ReservationEmailData data) {
        String cancelToken = data.cancelToken();
        if (cancelToken == null || cancelToken.isEmpty()) {
            return null;
        }
        String base = EmailLayout.trimTrailingSlash(frontendUrl);
        String slug = data.restaurantSlug() == null ? "" : data.restaurantSlug().trim();
        String code = data.confirmationCode();
        String path = slug.isEmpty()
                ? base + "/r/_/reservation/" + code
                : base + "/r/" + slug + "/reservation/" + code;
        return path + "?cancelToken=" + URLEncoder.encode(cancelToken, StandardCharsets.UTF_8);
    }
}
