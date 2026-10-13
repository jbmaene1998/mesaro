package com.mesaro.email;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.config.AppProperties;
import com.mesaro.infra.EmailService;
import com.mesaro.infra.LogSanitizer;
import com.mesaro.security.RestaurantRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "app.email.provider", havingValue = "resend")
public class ResendEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(ResendEmailService.class);
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiBaseUrl;
    private final String apiKey;
    private final String fromAddress;
    private final String supportAddress;
    private final String baseUrl;

    public ResendEmailService(AppProperties appProperties, ObjectMapper objectMapper) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = objectMapper;
        this.apiBaseUrl = trimTrailingSlash(appProperties.getEmail().getResend().getApiBaseUrl());
        this.apiKey = appProperties.getEmail().getResend().getApiKey();
        this.fromAddress = appProperties.getEmail().getFormattedFrom();
        this.supportAddress = trimToNull(appProperties.getEmail().getSupportAddress());
        this.baseUrl = appProperties.getBaseUrl();
    }

    private static final DateTimeFormatter TRIAL_DATE_FMT =
            DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH).withZone(ZoneOffset.UTC);

    @Override
    public void sendTrialEndingReminder(String email, String fullName, Instant trialEndsAt) {
        String displayName = fullName == null || fullName.isBlank() ? "there" : fullName.trim();
        String expiryDate  = trialEndsAt != null ? TRIAL_DATE_FMT.format(trialEndsAt) : "soon";
        String subject     = "Your Mesaro free trial ends on " + expiryDate;
        String subscribeUrl = baseUrl + "/settings/billing";
        String plainBody = String.format("""
                Hi %s,

                Your Mesaro free trial expires on %s.

                Subscribe now to keep your booking pages live and avoid any service interruption.

                %s
                """, displayName, expiryDate, subscribeUrl);
        sendHtmlEmail(
                email, subject, plainBody,
                "Your trial is ending soon", "Subscribe to keep your restaurant running",
                "<p>Hi <strong>" + escapeHtml(displayName) + "</strong>,</p>" +
                        "<p>Your free trial expires on <strong>" + escapeHtml(expiryDate) + "</strong>.</p>" +
                        "<p>Subscribe now to keep your booking pages active and avoid any disruption.</p>",
                "Subscribe now", subscribeUrl
        );
    }

    @Override
    public void sendStaffInvite(String email, String restaurantName, RestaurantRole role, String inviteToken) {
        String subject = "You've been invited to join " + restaurantName + " on Mesaro";
        String inviteUrl = baseUrl + "/invite/accept?token=" + inviteToken;
        String plainBody = String.format("""
                You have been invited to join %s as a %s.

                Click the link below to accept the invitation:
                %s

                This invitation will expire in 72 hours.

                If you did not expect this invitation, you can safely ignore this email.
                """, restaurantName, role.name().toLowerCase(), inviteUrl);
        sendHtmlEmail(
                email, subject, plainBody, "You are invited", "Join your team on Mesaro",
                "<p>You have been invited to join <strong>" + escapeHtml(restaurantName) + "</strong> as a <strong>"
                        + escapeHtml(role.name().toLowerCase()) + "</strong>.</p>" +
                        "<p>Accept your invitation to access staff features and planning tools.</p>",
                "Accept Invite", inviteUrl
        );
    }

    @Override
    public void sendPasswordReset(String email, String resetToken) {
        String subject = "Reset your Mesaro password";
        String resetUrl = baseUrl + "/reset-password?token=" + resetToken;
        String plainBody = String.format("""
                We received a request to reset your Mesaro password.

                Click the link below to reset your password:
                %s

                This link will expire in 2 hours.

                If you did not request a password reset, you can safely ignore this email.
                """, resetUrl);
        sendHtmlEmail(
                email, subject, plainBody, "Reset your password", "Secure your account",
                "<p>We received a request to reset your Mesaro password.</p>" +
                        "<p>For security, this link expires in 2 hours.</p>",
                "Reset Password", resetUrl
        );
    }

    @Override
    public void sendPasswordChangedNotice(String email) {
        String subject = "Your Mesaro password was changed";
        String plainBody = """
                Your Mesaro password was changed successfully.

                If this was not you, reset your password immediately and contact support.
                """;
        sendHtmlEmail(
                email, subject, plainBody, "Password updated", "Security notice",
                "<p>Your Mesaro password has been changed.</p>" +
                        "<p>If you did not perform this action, secure your account immediately.</p>",
                "Review Account", baseUrl + "/login"
        );
    }

    @Override
    public void sendWelcomeEmail(String email, String fullName) {
        String subject = "Welcome to Mesaro";
        String displayName = fullName == null || fullName.isBlank() ? "there" : fullName.trim();
        String plainBody = String.format("""
                Welcome to Mesaro, %s.

                Your account is ready. You can now set up your restaurant and start taking reservations.
                """, displayName);
        sendHtmlEmail(
                email, subject, plainBody, "Welcome to Mesaro", "Your account is ready",
                "<p>Hi <strong>" + escapeHtml(displayName) + "</strong>,</p>" +
                        "<p>Your account is ready. Start by setting up your first restaurant and publishing your booking page.</p>",
                "Start Setup", baseUrl + "/onboarding/setup"
        );
    }

    @Override
    public void sendAccountDeletionNoticeToOwner(String ownerEmail, String removedUserEmail, String restaurantName) {
        String subject = "Team member account deleted on Mesaro";
        String plainBody = String.format("""
                A team member account has been deleted.

                Restaurant: %s
                Removed account: %s

                If this was unexpected, review your team access in Mesaro.
                """, restaurantName, removedUserEmail);
        sendHtmlEmail(
                ownerEmail, subject, plainBody, "Team account deleted", "Review access changes",
                "<p>A team member account has been deleted.</p>" +
                        "<p><strong>Restaurant:</strong> " + escapeHtml(restaurantName) + "<br/>" +
                        "<strong>Removed account:</strong> " + escapeHtml(removedUserEmail) + "</p>",
                "Open Team Settings", baseUrl + "/staff"
        );
    }

    @Override
    public void sendStaffRemovalNotice(String removedUserEmail, String restaurantName) {
        String subject = "You were removed from a Mesaro team";
        String plainBody = String.format("""
                Your access to %s has been removed.

                If you believe this is a mistake, please contact the restaurant owner.
                """, restaurantName);
        sendHtmlEmail(
                removedUserEmail, subject, plainBody, "Team access removed", "Your membership was updated",
                "<p>Your access to <strong>" + escapeHtml(restaurantName) + "</strong> has been removed.</p>" +
                        "<p>If this is unexpected, contact the restaurant owner.</p>",
                "Go to Mesaro", baseUrl + "/login"
        );
    }

    @Override
    public void sendReservationConfirmation(String toEmail, String subject, String bodyText, byte[] icsAttachmentBytes) {
        sendEmail(
                toEmail,
                subject,
                bodyText,
                buildEmailLayout("Reservation confirmed", "Your booking is secured",
                        "<p>Your reservation has been confirmed.</p><p>" + nl2br(escapeHtml(bodyText)) + "</p>",
                        null, null),
                icsAttachmentBytes
        );
    }

    @Override
    public void sendReservationReminder(String toEmail, String subject, String bodyText) {
        sendHtmlEmail(
                toEmail, subject, bodyText, "Upcoming reservation reminder", "Your booking starts soon",
                "<p>Your reservation is coming up soon.</p><p>" + nl2br(escapeHtml(bodyText)) + "</p>",
                null, null
        );
    }

    @Override
    public void sendReservationCancelled(String toEmail, String guestName, String restaurantName, String confirmationCode, String cancelledBy) {
        String subject = "Your reservation was cancelled";
        String plainBody = String.format("""
                Hi %s,

                Your reservation at %s has been cancelled.
                Confirmation code: %s
                Cancelled by: %s
                """, guestName, restaurantName, confirmationCode, cancelledBy);
        sendHtmlEmail(
                toEmail, subject, plainBody, "Reservation cancelled", "Booking status changed",
                "<p>Hi <strong>" + escapeHtml(guestName) + "</strong>,</p>" +
                        "<p>Your reservation at <strong>" + escapeHtml(restaurantName) + "</strong> was cancelled.</p>" +
                        "<p><strong>Confirmation code:</strong> " + escapeHtml(confirmationCode) + "<br/>" +
                        "<strong>Cancelled by:</strong> " + escapeHtml(cancelledBy) + "</p>",
                "Book Again", baseUrl
        );
    }

    @Override
    public void sendReservationUpdated(String toEmail, String guestName, String restaurantName, String confirmationCode) {
        String subject = "Your reservation was updated";
        String plainBody = String.format("""
                Hi %s,

                Your reservation at %s was updated.
                Confirmation code: %s
                """, guestName, restaurantName, confirmationCode);
        sendHtmlEmail(
                toEmail, subject, plainBody, "Reservation updated", "Booking details changed",
                "<p>Hi <strong>" + escapeHtml(guestName) + "</strong>,</p>" +
                        "<p>Your reservation at <strong>" + escapeHtml(restaurantName) + "</strong> was updated.</p>" +
                        "<p><strong>Confirmation code:</strong> " + escapeHtml(confirmationCode) + "</p>",
                "View Reservation", baseUrl
        );
    }

    @Override
    public void sendContactFormSubmission(String toEmail,
                                          String senderName,
                                          String senderEmail,
                                          String message,
                                          String restaurantName) {
        String subject = "New contact form submission";
        String safeRestaurantName = restaurantName == null || restaurantName.isBlank() ? "-" : restaurantName.trim();
        String plainBody = String.format("""
                New contact form submission:

                Name: %s
                Email: %s
                Restaurant: %s

                Message:
                %s
                """, senderName, senderEmail, safeRestaurantName, message);
        sendHtmlEmail(
                toEmail,
                subject,
                plainBody,
                "Contact form submitted",
                "A new website contact form was submitted",
                "<p><strong>Name:</strong> " + escapeHtml(senderName) + "</p>" +
                        "<p><strong>Email:</strong> " + escapeHtml(senderEmail) + "</p>" +
                        "<p><strong>Restaurant:</strong> " + escapeHtml(safeRestaurantName) + "</p>" +
                        "<p><strong>Message:</strong></p><p>" + nl2br(escapeHtml(message)) + "</p>",
                null,
                null,
                trimToNull(senderEmail)
        );
    }

    private void sendHtmlEmail(String to,
                               String subject,
                               String plainBody,
                               String title,
                               String preheader,
                               String contentHtml,
                               String ctaLabel,
                               String ctaUrl) {
        sendHtmlEmail(to, subject, plainBody, title, preheader, contentHtml, ctaLabel, ctaUrl, supportAddress);
    }

    private void sendHtmlEmail(String to,
                               String subject,
                               String plainBody,
                               String title,
                               String preheader,
                               String contentHtml,
                               String ctaLabel,
                               String ctaUrl,
                               String replyTo) {
        sendEmail(to, subject, plainBody, buildEmailLayout(title, preheader, contentHtml, ctaLabel, ctaUrl), null, replyTo);
    }

    private void sendEmail(String to, String subject, String textBody, String htmlBody, byte[] attachmentBytes) {
        sendEmail(to, subject, textBody, htmlBody, attachmentBytes, supportAddress);
    }

    private void sendEmail(String to,
                           String subject,
                           String textBody,
                           String htmlBody,
                           byte[] attachmentBytes,
                           String replyTo) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("from", fromAddress);
            payload.put("to", List.of(to));
            payload.put("subject", subject);
            payload.put("text", textBody);
            payload.put("html", htmlBody);
            if (replyTo != null && !replyTo.isBlank()) {
                payload.put("reply_to", List.of(replyTo));
            }
            if (attachmentBytes != null && attachmentBytes.length > 0) {
                payload.put("attachments", List.of(Map.of(
                        "filename", "reservation.ics",
                        "content", Base64.getEncoder().encodeToString(attachmentBytes),
                        "type", "text/calendar"
                )));
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiBaseUrl + "/emails"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new EmailSendException("Resend API returned status " + response.statusCode() + ": " + response.body());
            }
            log.info("Sent email to {} via Resend with subject '{}'", LogSanitizer.maskEmail(to), subject);
        } catch (JsonProcessingException e) {
            throw new EmailSendException("Failed to serialize Resend payload", e);
        } catch (Exception e) {
            log.error("Failed to send email to {} via Resend: {}",
                    LogSanitizer.maskEmail(to), LogSanitizer.exceptionType(e));
            throw new EmailSendException("Failed to send email via Resend", e);
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String buildEmailLayout(String title,
                                    String preheader,
                                    String contentHtml,
                                    String ctaLabel,
                                    String ctaUrl) {
        String safeTitle = escapeHtml(title);
        String safePreheader = preheader == null ? "" : escapeHtml(preheader);
        String safeLogoUrl = escapeHtml(buildAppUrl("/brand/mesaro-wordmark.png"));
        String cta = "";
        if (ctaLabel != null && ctaUrl != null) {
            cta = "<p style=\"margin:28px 0 0 0;\"><a href=\"" + escapeHtml(ctaUrl) + "\" " +
                    "style=\"display:inline-block;padding:12px 18px;background:#C8553D;color:#ffffff;" +
                    "text-decoration:none;border-radius:10px;font-weight:700;box-shadow:0 10px 24px rgba(200,85,61,.28);\">" +
                    escapeHtml(ctaLabel) + "</a></p>";
        }

        return "<!doctype html><html><head><meta charset=\"utf-8\"/>" +
                "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>" +
                "<title>" + safeTitle + "</title></head>" +
                "<body style=\"margin:0;padding:24px;background:#F6EFE6;font-family:Segoe UI,Arial,sans-serif;color:#3E4A32;\">" +
                "<div style=\"max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e6d9c8;border-radius:18px;overflow:hidden;box-shadow:0 18px 40px rgba(62,74,50,.08);\">" +
                "<div style=\"padding:24px 30px;background:#F6EFE6;border-bottom:1px solid #e6d9c8;\">" +
                "<img src=\"" + safeLogoUrl + "\" alt=\"Mesaro\" style=\"display:block;height:48px;width:auto;\"/>" +
                "</div>" +
                "<div style=\"padding:28px 30px;background:#C8553D;color:#ffffff;\">" +
                "<div style=\"font-size:12px;opacity:.95;letter-spacing:.12em;text-transform:uppercase;\">Mesaro Notification</div>" +
                "<h1 style=\"margin:10px 0 0 0;font-size:24px;line-height:1.2;\">" + safeTitle + "</h1>" +
                "<p style=\"margin:10px 0 0 0;font-size:14px;opacity:.95;\">" + safePreheader + "</p>" +
                "</div>" +
                "<div style=\"padding:28px 30px;font-size:15px;line-height:1.65;color:#3E4A32;\">" +
                contentHtml + cta +
                "<hr style=\"margin:28px 0;border:0;border-top:1px solid #e6d9c8;\"/>" +
                "<p style=\"margin:0;color:#3E4A32;font-size:12px;opacity:.75;\">This message was sent by Mesaro.</p>" +
                "</div></div></body></html>";
    }

    private String buildAppUrl(String path) {
        return trimTrailingSlash(baseUrl) + path;
    }

    private String nl2br(String text) {
        return text.replace("\r\n", "\n").replace("\n", "<br/>");
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String trimTrailingSlash(String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
