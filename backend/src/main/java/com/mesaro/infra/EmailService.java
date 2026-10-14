package com.mesaro.infra;

import com.mesaro.email.layout.EmailDocument;
import com.mesaro.security.RestaurantRole;

import java.time.Instant;

public interface EmailService {

    /**
     * Sent ~3 days before the in-app free trial expires to prompt subscription.
     *
     * @param email      Operator email address
     * @param fullName   Operator display name (may be null)
     * @param trialEndsAt UTC timestamp when the trial expires
     */
    void sendTrialEndingReminder(String email, String fullName, Instant trialEndsAt);

    void sendStaffInvite(String email, String restaurantName, RestaurantRole role, String inviteToken);

    void sendPasswordReset(String email, String resetToken);

    void sendEmailVerification(String email, String fullName, String verificationToken);

    void sendPasswordChangedNotice(String email);

    void sendWelcomeEmail(String email, String fullName);

    void sendAccountDeletionNoticeToOwner(String ownerEmail, String removedUserEmail, String restaurantName);

    void sendStaffRemovalNotice(String removedUserEmail, String restaurantName);

    /**
     * Send a reservation confirmation email with ICS calendar attachment.
     */
    void sendReservationConfirmation(String toEmail,
                                     String subject,
                                     String plainBody,
                                     EmailDocument document,
                                     byte[] icsAttachmentBytes);

    /**
     * Send a reservation reminder email.
     */
    void sendReservationReminder(String toEmail,
                                 String subject,
                                 String plainBody,
                                 EmailDocument document);

    void sendReservationCancelled(String toEmail,
                                  String guestName,
                                  String restaurantName,
                                  String restaurantSlug,
                                  String confirmationCode,
                                  String cancelledBy);

    void sendReservationUpdated(String toEmail,
                                String guestName,
                                String restaurantName,
                                String restaurantSlug,
                                String confirmationCode);

    void sendContactFormSubmission(String toEmail,
                                   String senderName,
                                   String senderEmail,
                                   String message,
                                   String restaurantName);

}
