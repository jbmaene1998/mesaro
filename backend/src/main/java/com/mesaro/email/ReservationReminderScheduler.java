package com.mesaro.email;

import com.mesaro.email.layout.ReservationEmailComposer;
import com.mesaro.infra.EmailService;
import com.mesaro.infra.LogSanitizer;
import com.mesaro.infra.TimeService;
import com.mesaro.reservation.Reservation;
import com.mesaro.reservation.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

@Service
public class ReservationReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReservationReminderScheduler.class);

    private final ReservationRepository reservationRepository;
    private final EmailService emailService;
    private final EmailSendLogService emailSendLogService;
    private final TimeService timeService;

    @Value("${app.notifications.reservation-reminder.enabled:true}")
    private boolean reminderEnabled;

    @Value("${app.notifications.reservation-reminder.minutes-before:120}")
    private long minutesBefore;

    @Value("${app.notifications.reservation-reminder.window-minutes:15}")
    private long windowMinutes;

    public ReservationReminderScheduler(ReservationRepository reservationRepository,
                                        EmailService emailService,
                                        EmailSendLogService emailSendLogService,
                                        TimeService timeService) {
        this.reservationRepository = reservationRepository;
        this.emailService = emailService;
        this.emailSendLogService = emailSendLogService;
        this.timeService = timeService;
    }

    @Scheduled(cron = "${app.notifications.reservation-reminder.cron:0 */15 * * * *}")
    @Transactional
    public void sendUpcomingReservationReminders() {
        if (!reminderEnabled) {
            return;
        }

        Instant now = timeService.now();
        Instant windowStart = now.plusSeconds(minutesBefore * 60);
        Instant windowEnd = windowStart.plusSeconds(windowMinutes * 60);
        List<Reservation> reservations =
                reservationRepository.findConfirmedStartingBetweenWithRestaurant(windowStart, windowEnd);

        int sent = 0;
        int skipped = 0;
        int failed = 0;
        for (Reservation reservation : reservations) {
            if (reservation.getGuestEmail() == null || reservation.getGuestEmail().isBlank()) {
                skipped++;
                continue;
            }

            if (emailSendLogService.wasSent("RESERVATION_REMINDER", "RESERVATION", reservation.getId())) {
                skipped++;
                continue;
            }

            var composed = buildReminder(reservation);
            try {
                emailService.sendReservationReminder(
                        reservation.getGuestEmail(),
                        composed.subject(),
                        composed.plainBody(),
                        composed.document()
                );
                emailSendLogService.logSent(
                        reservation.getRestaurant().getId(),
                        reservation.getGuestEmail(),
                        "RESERVATION_REMINDER",
                        composed.subject(),
                        "RESERVATION",
                        reservation.getId()
                );
                sent++;
            } catch (Exception ex) {
                emailSendLogService.logFailed(
                        reservation.getRestaurant().getId(),
                        reservation.getGuestEmail(),
                        "RESERVATION_REMINDER",
                        composed.subject(),
                        "RESERVATION",
                        reservation.getId(),
                        ex.getMessage()
                );
                failed++;
                log.warn("Failed reservation reminder for reservation {} and guest {}",
                        reservation.getConfirmationCode(), LogSanitizer.maskEmail(reservation.getGuestEmail()));
            }
        }

        if (sent > 0 || failed > 0) {
            log.info("Reservation reminder job completed: sent={}, skipped={}, failed={}", sent, skipped, failed);
        }
    }

    private ReservationEmailComposer.ComposedEmail buildReminder(Reservation reservation) {
        ZoneId timezone = ZoneId.of(reservation.getRestaurant().getTimezone());
        String localTime = ReservationEmailComposer.formatReminderLocalTime(
                reservation.getStartAtUtc(), timezone);
        return ReservationEmailComposer.reminder(
                reservation.getGuestName(),
                reservation.getRestaurant().getName(),
                reservation.getConfirmationCode(),
                reservation.getPartySize(),
                localTime,
                reservation.getRestaurant().getTimezone()
        );
    }
}
