package com.mesaro.email;

import com.mesaro.email.layout.ReservationEmailComposer;
import com.mesaro.infra.EmailService;
import com.mesaro.infra.LogSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Sends reservation confirmation emails after transaction commit.
 *
 * Design decision: Using after-commit hook ensures that:
 * 1. The reservation is fully persisted before we try to send email
 * 2. Email failures do not roll back the reservation transaction
 * 3. SMTP issues do not block the user's reservation flow
 *
 * Trade-off: If email sending fails, the reservation exists but the guest
 * won't receive confirmation. This is acceptable because:
 * - The guest sees confirmation in the UI immediately
 * - Staff can manually resend if needed
 * - Audit trail records the reservation
 */
@Component
public class ReservationConfirmationEmailSender {

    private static final Logger log = LoggerFactory.getLogger(ReservationConfirmationEmailSender.class);

    private final EmailService emailService;
    private final IcsService icsService;
    private final String frontendUrl;
    private final String fromEmail;

    public ReservationConfirmationEmailSender(
            EmailService emailService,
            IcsService icsService,
            @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl,
            @Value("${app.email.from-address:noreply@mesaro.com}") String fromEmail) {
        this.emailService = emailService;
        this.icsService = icsService;
        this.frontendUrl = frontendUrl;
        this.fromEmail = fromEmail;
    }

    /**
     * Schedule a confirmation email to be sent after the current transaction commits.
     * If not in a transaction, sends immediately.
     *
     * @param emailData Reservation data for the email
     */
    public void sendAfterCommit(ReservationEmailData emailData) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendConfirmationEmailSafe(emailData);
                }
            });
            log.debug("Scheduled confirmation email for {} after commit", emailData.confirmationCode());
        } else {
            // No active transaction, send immediately
            sendConfirmationEmailSafe(emailData);
        }
    }

    public void send(ReservationEmailData emailData) {
        sendConfirmationEmailOrThrow(emailData);
    }

    private void sendConfirmationEmailSafe(ReservationEmailData data) {
        try {
            sendConfirmationEmailOrThrow(data);
        } catch (Exception e) {
            // Log error but don't rethrow - email failure should not affect the user
            log.error("Failed to send confirmation email for reservation {} to {}: {}",
                    data.confirmationCode(), LogSanitizer.maskEmail(data.guestEmail()),
                    LogSanitizer.exceptionType(e), e);
        }
    }

    private void sendConfirmationEmailOrThrow(ReservationEmailData data) {
        var composed = ReservationEmailComposer.confirmation(data, frontendUrl);
        byte[] icsBytes = buildIcsAttachment(data);

        emailService.sendReservationConfirmation(
                data.guestEmail(),
                composed.subject(),
                composed.plainBody(),
                composed.document(),
                icsBytes
        );
        log.info("Sent confirmation email for reservation {} to {}",
                data.confirmationCode(), LogSanitizer.maskEmail(data.guestEmail()));
    }

    private byte[] buildIcsAttachment(ReservationEmailData data) {
        String summary = String.format("Reservation at %s", data.restaurantName());
        String description = String.format(
                "Reservation for %d guests\\nConfirmation: %s\\nTable(s): %s",
                data.partySize(),
                data.confirmationCode(),
                String.join(", ", data.tableLabels())
        );

        return icsService.generateReservationIcs(
                data.confirmationCode(),
                summary,
                description,
                data.restaurantName(),
                data.startAtUtc(),
                data.endAtUtc(),
                data.getTimezoneId(),
                fromEmail
        );
    }
}
