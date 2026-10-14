package com.mesaro.email;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.config.AppProperties;
import com.mesaro.email.layout.EmailBlocks;
import com.mesaro.email.layout.EmailBrandAssets;
import com.mesaro.email.layout.EmailDocument;
import com.mesaro.email.layout.EmailLayout;
import com.mesaro.email.layout.EmailTone;
import com.mesaro.email.layout.ReservationEmailComposer;
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
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "app.email.provider", havingValue = "resend")
public class ResendEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(ResendEmailService.class);
    private static final DateTimeFormatter TRIAL_DATE_FMT =
            DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH).withZone(ZoneOffset.UTC);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final EmailLayout emailLayout;
    private final EmailBrandAssets emailBrandAssets;
    private final String apiBaseUrl;
    private final String apiKey;
    private final String fromAddress;
    private final String supportAddress;

    public ResendEmailService(AppProperties appProperties,
                              ObjectMapper objectMapper,
                              EmailLayout emailLayout,
                              EmailBrandAssets emailBrandAssets) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = objectMapper;
        this.emailLayout = emailLayout;
        this.emailBrandAssets = emailBrandAssets;
        this.apiBaseUrl = EmailLayout.trimTrailingSlash(appProperties.getEmail().getResend().getApiBaseUrl());
        this.apiKey = appProperties.getEmail().getResend().getApiKey();
        this.fromAddress = appProperties.getEmail().getFormattedFrom();
        this.supportAddress = trimToNull(appProperties.getEmail().getSupportAddress());
    }

    @Override
    public void sendTrialEndingReminder(String email, String fullName, Instant trialEndsAt) {
        String displayName = fullName == null || fullName.isBlank() ? "there" : fullName.trim();
        String expiryDate = trialEndsAt != null ? TRIAL_DATE_FMT.format(trialEndsAt) : "soon";
        String subject = "Your Mesaro free trial ends on " + expiryDate;
        String subscribeUrl = emailLayout.url("/settings/billing");
        String plainBody = String.format("""
                Hi %s,

                Your Mesaro free trial expires on %s.

                Subscribe now to keep your booking pages live and avoid any service interruption.

                %s
                """, displayName, expiryDate, subscribeUrl);
        sendHtmlEmail(
                email, subject, plainBody,
                EmailDocument.of(
                        "Your trial is ending soon",
                        "Subscribe to keep your restaurant running",
                        EmailBlocks.paragraph("Hi <strong>" + EmailBlocks.escape(displayName) + "</strong>,")
                                + EmailBlocks.paragraph("Your free trial expires on <strong>"
                                + EmailBlocks.escape(expiryDate) + "</strong>.")
                                + EmailBlocks.paragraph(
                                "Subscribe now to keep your booking pages active and avoid any disruption."),
                        "Subscribe now",
                        subscribeUrl,
                        EmailTone.DEFAULT
                )
        );
    }

    @Override
    public void sendStaffInvite(String email, String restaurantName, RestaurantRole role, String inviteToken) {
        String subject = "You've been invited to join " + restaurantName + " on Mesaro";
        String inviteUrl = emailLayout.url("/accept-invite?token=" + inviteToken);
        String plainBody = String.format("""
                You have been invited to join %s as a %s.

                Click the link below to accept the invitation:
                %s

                This invitation will expire in 72 hours.

                If you did not expect this invitation, you can safely ignore this email.
                """, restaurantName, role.name().toLowerCase(), inviteUrl);
        sendHtmlEmail(
                email, subject, plainBody,
                EmailDocument.of(
                        "You are invited",
                        "Join your team on Mesaro",
                        EmailBlocks.paragraph(
                                "You have been invited to join <strong>" + EmailBlocks.escape(restaurantName)
                                        + "</strong> as a <strong>"
                                        + EmailBlocks.escape(role.name().toLowerCase()) + "</strong>.")
                                + EmailBlocks.paragraph(
                                "Accept your invitation to access staff features and planning tools.")
                                + EmailBlocks.mutedNote("This invitation expires in 72 hours."),
                        "Accept Invite",
                        inviteUrl,
                        EmailTone.DEFAULT
                )
        );
    }

    @Override
    public void sendPasswordReset(String email, String resetToken) {
        String subject = "Reset your Mesaro password";
        String resetUrl = emailLayout.url("/reset-password?token=" + resetToken);
        String plainBody = String.format("""
                We received a request to reset your Mesaro password.

                Click the link below to reset your password:
                %s

                This link will expire in 2 hours.

                If you did not request a password reset, you can safely ignore this email.
                """, resetUrl);
        sendHtmlEmail(
                email, subject, plainBody,
                EmailDocument.of(
                        "Reset your password",
                        "This link expires in 2 hours",
                        EmailBlocks.paragraph("We received a request to reset your Mesaro password.")
                                + EmailBlocks.paragraph("For security, this link expires in 2 hours."),
                        "Reset Password",
                        resetUrl,
                        EmailTone.SECURITY
                )
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
                email, subject, plainBody,
                EmailDocument.of(
                        "Password updated",
                        "Security notice for your Mesaro account",
                        EmailBlocks.paragraph("Your Mesaro password has been changed.")
                                + EmailBlocks.paragraph(
                                "If you did not perform this action, secure your account immediately."),
                        "Review Account",
                        emailLayout.url("/login"),
                        EmailTone.SECURITY
                )
        );
    }

    @Override
    public void sendEmailVerification(String email, String fullName, String verificationToken) {
        String subject = "Verify your account";
        String verifyUrl = emailLayout.url("/verify-email?token=" + verificationToken);
        String displayName = fullName == null || fullName.isBlank() ? "there" : fullName.trim();
        String plainBody = String.format("""
                Hi %s,

                Confirm your email to finish creating your Mesaro account.

                %s

                This link expires in 48 hours. If you did not create this account, you can ignore this email.
                """, displayName, verifyUrl);
        sendHtmlEmail(
                email, subject, plainBody,
                EmailDocument.of(
                        "Verify your account",
                        "Confirm your email to use Mesaro",
                        EmailBlocks.paragraph("Hi <strong>" + EmailBlocks.escape(displayName) + "</strong>,")
                                + EmailBlocks.paragraph(
                                "Confirm your email before you sign in, finish onboarding, or use Mesaro.")
                                + EmailBlocks.mutedNote("This link expires in 48 hours."),
                        "Verify your account",
                        verifyUrl,
                        EmailTone.SECURITY
                )
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
                email, subject, plainBody,
                EmailDocument.of(
                        "Welcome to Mesaro",
                        "Your account is ready",
                        EmailBlocks.paragraph("Hi <strong>" + EmailBlocks.escape(displayName) + "</strong>,")
                                + EmailBlocks.paragraph(
                                "Your account is ready. Start by setting up your first restaurant and publishing your booking page."),
                        "Start Setup",
                        emailLayout.url("/onboarding"),
                        EmailTone.DEFAULT
                )
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
        LinkedHashMap<String, String> rows = new LinkedHashMap<>();
        rows.put("Restaurant", restaurantName);
        rows.put("Removed account", removedUserEmail);
        sendHtmlEmail(
                ownerEmail, subject, plainBody,
                EmailDocument.of(
                        "Team account deleted",
                        "Review access changes",
                        EmailBlocks.paragraph("A team member account has been deleted.")
                                + EmailBlocks.detailRows(rows),
                        "Open Team Settings",
                        emailLayout.url("/staff"),
                        EmailTone.DEFAULT
                )
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
                removedUserEmail, subject, plainBody,
                EmailDocument.of(
                        "Team access removed",
                        "Your membership was updated",
                        EmailBlocks.paragraph(
                                "Your access to <strong>" + EmailBlocks.escape(restaurantName)
                                        + "</strong> has been removed.")
                                + EmailBlocks.paragraph("If this is unexpected, contact the restaurant owner."),
                        "Go to Mesaro",
                        emailLayout.url("/login"),
                        EmailTone.DEFAULT
                )
        );
    }

    @Override
    public void sendReservationConfirmation(String toEmail,
                                            String subject,
                                            String plainBody,
                                            EmailDocument document,
                                            byte[] icsAttachmentBytes) {
        sendEmail(toEmail, subject, plainBody, emailLayout.render(document), icsAttachmentBytes);
    }

    @Override
    public void sendReservationReminder(String toEmail,
                                        String subject,
                                        String plainBody,
                                        EmailDocument document) {
        sendEmail(toEmail, subject, plainBody, emailLayout.render(document), null);
    }

    @Override
    public void sendReservationCancelled(String toEmail,
                                         String guestName,
                                         String restaurantName,
                                         String restaurantSlug,
                                         String confirmationCode,
                                         String cancelledBy) {
        String subject = "Your reservation was cancelled";
        String bookUrl = ReservationEmailComposer.bookingPageUrl(emailLayout.frontendUrl(), restaurantSlug);
        String plainBody = String.format("""
                Hi %s,

                Your reservation at %s has been cancelled.
                Confirmation code: %s
                Cancelled by: %s

                Book again: %s
                """, guestName, restaurantName, confirmationCode, cancelledBy, bookUrl);
        LinkedHashMap<String, String> rows = new LinkedHashMap<>();
        rows.put("Restaurant", restaurantName);
        rows.put("Confirmation", confirmationCode);
        rows.put("Cancelled by", cancelledBy);
        sendHtmlEmail(
                toEmail, subject, plainBody,
                EmailDocument.of(
                        "Reservation cancelled",
                        "Booking status changed",
                        EmailBlocks.paragraph(
                                "Hi <strong>" + EmailBlocks.escape(guestName) + "</strong>, your reservation was cancelled.")
                                + EmailBlocks.detailRows(rows),
                        "Book again",
                        bookUrl,
                        EmailTone.GUEST
                )
        );
    }

    @Override
    public void sendReservationUpdated(String toEmail,
                                       String guestName,
                                       String restaurantName,
                                       String restaurantSlug,
                                       String confirmationCode) {
        String subject = "Your reservation was updated";
        String bookUrl = ReservationEmailComposer.bookingPageUrl(emailLayout.frontendUrl(), restaurantSlug);
        String plainBody = String.format("""
                Hi %s,

                Your reservation at %s was updated.
                Confirmation code: %s

                View details: %s
                """, guestName, restaurantName, confirmationCode, bookUrl);
        LinkedHashMap<String, String> rows = new LinkedHashMap<>();
        rows.put("Restaurant", restaurantName);
        rows.put("Confirmation", confirmationCode);
        sendHtmlEmail(
                toEmail, subject, plainBody,
                EmailDocument.of(
                        "Reservation updated",
                        "Booking details changed",
                        EmailBlocks.paragraph(
                                "Hi <strong>" + EmailBlocks.escape(guestName)
                                        + "</strong>, your reservation at <strong>"
                                        + EmailBlocks.escape(restaurantName) + "</strong> was updated.")
                                + EmailBlocks.detailRows(rows),
                        "View restaurant",
                        bookUrl,
                        EmailTone.GUEST
                )
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
        LinkedHashMap<String, String> rows = new LinkedHashMap<>();
        rows.put("Name", senderName);
        rows.put("Email", senderEmail);
        rows.put("Restaurant", safeRestaurantName);
        sendHtmlEmail(
                toEmail,
                subject,
                plainBody,
                EmailDocument.of(
                        "Contact form submitted",
                        "A new website contact form was submitted",
                        EmailBlocks.detailRows(rows)
                                + EmailBlocks.paragraph("<strong>Message</strong>")
                                + EmailBlocks.paragraph(EmailBlocks.nl2br(message)),
                        null,
                        null,
                        EmailTone.DEFAULT
                ),
                trimToNull(senderEmail)
        );
    }

    private void sendHtmlEmail(String to, String subject, String plainBody, EmailDocument document) {
        sendHtmlEmail(to, subject, plainBody, document, supportAddress);
    }

    private void sendHtmlEmail(String to,
                               String subject,
                               String plainBody,
                               EmailDocument document,
                               String replyTo) {
        sendEmail(to, subject, plainBody, emailLayout.render(document), null, replyTo);
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
            List<Map<String, Object>> attachments = new ArrayList<>();
            attachments.add(Map.of(
                    "filename", EmailBrandAssets.LOGO_FILENAME,
                    "content", Base64.getEncoder().encodeToString(emailBrandAssets.logoPngBytes()),
                    "content_type", EmailBrandAssets.LOGO_CONTENT_TYPE,
                    "content_id", EmailBrandAssets.LOGO_CONTENT_ID
            ));
            if (attachmentBytes != null && attachmentBytes.length > 0) {
                attachments.add(Map.of(
                        "filename", "reservation.ics",
                        "content", Base64.getEncoder().encodeToString(attachmentBytes),
                        "content_type", "text/calendar"
                ));
            }
            payload.put("attachments", attachments);

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
}
