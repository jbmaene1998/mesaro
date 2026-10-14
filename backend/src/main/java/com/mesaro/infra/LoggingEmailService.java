package com.mesaro.infra;

import com.mesaro.email.layout.EmailDocument;
import com.mesaro.security.RestaurantRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.Instant;


/**
 * Email service implementation that logs emails instead of sending them.
 * Used when email sending is disabled.
 */
@Service
@ConditionalOnProperty(name = "app.email.provider", havingValue = "log", matchIfMissing = true)
public class LoggingEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailService.class);

    @Override
    public void sendTrialEndingReminder(String email, String fullName, Instant trialEndsAt) {
        log.info("Trial ending reminder to {} (trialEndsAt={}, fullName='{}')",
                LogSanitizer.maskEmail(email), trialEndsAt, fullName == null ? "" : fullName);
    }

    @Override
    public void sendStaffInvite(String email, String restaurantName, RestaurantRole role, String inviteToken) {
        log.info("Invite email to {} for restaurant '{}' role {} tokenFingerprint={}",
                LogSanitizer.maskEmail(email), restaurantName, role, LogSanitizer.tokenFingerprint(inviteToken));
    }

    @Override
    public void sendPasswordReset(String email, String resetToken) {
        log.info("Password reset email to {} tokenFingerprint={}",
                LogSanitizer.maskEmail(email), LogSanitizer.tokenFingerprint(resetToken));
    }

    @Override
    public void sendEmailVerification(String email, String fullName, String verificationToken) {
        log.info("Verification email to {} fullName='{}' tokenFingerprint={}",
                LogSanitizer.maskEmail(email),
                fullName == null ? "" : fullName,
                LogSanitizer.tokenFingerprint(verificationToken));
    }

    @Override
    public void sendPasswordChangedNotice(String email) {
        log.info("Password changed notice to {}", LogSanitizer.maskEmail(email));
    }

    @Override
    public void sendWelcomeEmail(String email, String fullName) {
        log.info("Welcome email to {} fullName='{}'",
                LogSanitizer.maskEmail(email), fullName == null ? "" : fullName);
    }

    @Override
    public void sendAccountDeletionNoticeToOwner(String ownerEmail, String removedUserEmail, String restaurantName) {
        log.info("Account deletion notice to owner {}: removedUser={} restaurant='{}'",
                LogSanitizer.maskEmail(ownerEmail), LogSanitizer.maskEmail(removedUserEmail), restaurantName);
    }

    @Override
    public void sendStaffRemovalNotice(String removedUserEmail, String restaurantName) {
        log.info("Staff removal notice to {} for restaurant '{}'",
                LogSanitizer.maskEmail(removedUserEmail), restaurantName);
    }

    @Override
    public void sendReservationConfirmation(String toEmail,
                                            String subject,
                                            String plainBody,
                                            EmailDocument document,
                                            byte[] icsAttachmentBytes) {
        log.info("Reservation confirmation email to {}: subject='{}', bodyLength={}, icsSize={}",
                LogSanitizer.maskEmail(toEmail), subject, plainBody.length(),
                icsAttachmentBytes != null ? icsAttachmentBytes.length : 0);
        log.debug("Reservation email body omitted from logs for security");
    }

    @Override
    public void sendReservationReminder(String toEmail,
                                        String subject,
                                        String plainBody,
                                        EmailDocument document) {
        log.info("Reservation reminder email to {}: subject='{}', bodyLength={}",
                LogSanitizer.maskEmail(toEmail), subject, plainBody.length());
        log.debug("Reservation reminder body omitted from logs for security");
    }

    @Override
    public void sendReservationCancelled(String toEmail,
                                         String guestName,
                                         String restaurantName,
                                         String restaurantSlug,
                                         String confirmationCode,
                                         String cancelledBy) {
        log.info("Reservation cancelled email to {} for {} ({}) by {}",
                LogSanitizer.maskEmail(toEmail), confirmationCode, restaurantName, cancelledBy);
    }

    @Override
    public void sendReservationUpdated(String toEmail,
                                       String guestName,
                                       String restaurantName,
                                       String restaurantSlug,
                                       String confirmationCode) {
        log.info("Reservation updated email to {} for {} ({})",
                LogSanitizer.maskEmail(toEmail), confirmationCode, restaurantName);
    }

    @Override
    public void sendContactFormSubmission(String toEmail,
                                          String senderName,
                                          String senderEmail,
                                          String message,
                                          String restaurantName) {
        log.info("Contact form email to {} from {} ({}) restaurant='{}' messageLength={}",
                LogSanitizer.maskEmail(toEmail),
                senderName,
                LogSanitizer.maskEmail(senderEmail),
                restaurantName == null ? "" : restaurantName,
                message == null ? 0 : message.length());
    }

}
