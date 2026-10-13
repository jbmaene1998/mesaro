package com.mesaro.email;

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
import jakarta.mail.internet.InternetAddress;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;

@Service
@ConditionalOnProperty(name = "app.email.provider", havingValue = "smtp")
public class SmtpEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailService.class);
    private static final DateTimeFormatter TRIAL_DATE_FMT =
            DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH).withZone(ZoneOffset.UTC);

    private final JavaMailSender mailSender;
    private final EmailLayout emailLayout;
    private final EmailBrandAssets emailBrandAssets;
    private final String fromAddress;
    private final String supportAddress;
    private final String fromName;

    public SmtpEmailService(JavaMailSender mailSender,
                            AppProperties appProperties,
                            EmailLayout emailLayout,
                            EmailBrandAssets emailBrandAssets) {
        this.mailSender = mailSender;
        this.emailLayout = emailLayout;
        this.emailBrandAssets = emailBrandAssets;
        this.fromAddress = appProperties.getEmail().getFromAddress();
        this.fromName = appProperties.getEmail().getFromName();
        String configuredSupport = appProperties.getEmail().getSupportAddress();
        this.supportAddress = configuredSupport == null || configuredSupport.isBlank()
                ? null
                : configuredSupport.trim();
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
        String replyTo = senderEmail == null || senderEmail.isBlank() ? null : senderEmail.trim();
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
                replyTo
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
            var message = mailSender.createMimeMessage();
            // Always multipart so the logo can be embedded as an inline CID part.
            var helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(textBody, htmlBody);
            helper.setFrom(resolveFromAddress());
            if (replyTo != null && !replyTo.isBlank()) {
                helper.setReplyTo(replyTo);
            }
            helper.addInline(
                    EmailBrandAssets.LOGO_CONTENT_ID,
                    new ByteArrayResource(emailBrandAssets.logoPngBytes()) {
                        @Override
                        public String getFilename() {
                            return EmailBrandAssets.LOGO_FILENAME;
                        }
                    },
                    EmailBrandAssets.LOGO_CONTENT_TYPE
            );
            if (attachmentBytes != null && attachmentBytes.length > 0) {
                helper.addAttachment(
                        "reservation.ics",
                        new ByteArrayResource(attachmentBytes),
                        "text/calendar; charset=UTF-8; method=REQUEST"
                );
            }
            mailSender.send(message);
            log.info("Sent SMTP email to {} with subject '{}'", LogSanitizer.maskEmail(to), subject);
        } catch (Exception ex) {
            log.error("Failed to send SMTP email to {}: {}",
                    LogSanitizer.maskEmail(to), LogSanitizer.exceptionType(ex));
            throw new EmailSendException("Failed to send email via SMTP", ex);
        }
    }

    private String resolveFromAddress() throws Exception {
        if (fromName == null || fromName.isBlank()) {
            return fromAddress;
        }
        return new InternetAddress(fromAddress, fromName, StandardCharsets.UTF_8.name()).toString();
    }
}
