package com.mesaro.email;

import com.mesaro.infra.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationConfirmationEmailSenderTest {

    @Mock
    private EmailService emailService;
    @Mock
    private IcsService icsService;

    private ReservationConfirmationEmailSender sender;

    @BeforeEach
    void setUp() {
        sender = new ReservationConfirmationEmailSender(
                emailService,
                icsService,
                "http://localhost:3000",
                "noreply@mesaro.com"
        );
    }

    @Test
    void send_propagatesEmailFailures() {
        ReservationEmailData data = sampleData();
        when(icsService.generateReservationIcs(
                data.confirmationCode(),
                "Reservation at Demo Bistro",
                "Reservation for 2 guests\\nConfirmation: RES-2026-ABCD1234\\nTable(s): T1",
                data.restaurantName(),
                data.startAtUtc(),
                data.endAtUtc(),
                data.getTimezoneId(),
                "noreply@mesaro.com"
        )).thenReturn("BEGIN:VCALENDAR".getBytes());
        org.mockito.Mockito.doThrow(new RuntimeException("smtp down"))
                .when(emailService)
                .sendReservationConfirmation(
                        org.mockito.ArgumentMatchers.eq(data.guestEmail()),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.any(byte[].class)
                );

        assertThatThrownBy(() -> sender.send(data))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("smtp down");
    }

    @Test
    void sendAfterCommit_swallowsEmailFailures() {
        ReservationEmailData data = sampleData();
        when(icsService.generateReservationIcs(
                data.confirmationCode(),
                "Reservation at Demo Bistro",
                "Reservation for 2 guests\\nConfirmation: RES-2026-ABCD1234\\nTable(s): T1",
                data.restaurantName(),
                data.startAtUtc(),
                data.endAtUtc(),
                data.getTimezoneId(),
                "noreply@mesaro.com"
        )).thenReturn("BEGIN:VCALENDAR".getBytes());
        org.mockito.Mockito.doThrow(new RuntimeException("smtp down"))
                .when(emailService)
                .sendReservationConfirmation(
                        org.mockito.ArgumentMatchers.eq(data.guestEmail()),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.any(byte[].class)
                );

        assertThatCode(() -> sender.sendAfterCommit(data)).doesNotThrowAnyException();
    }

    private ReservationEmailData sampleData() {
        return new ReservationEmailData(
                "RES-2026-ABCD1234",
                "Guest Name",
                "guest@example.com",
                2,
                Instant.parse("2026-01-15T18:00:00Z"),
                Instant.parse("2026-01-15T19:30:00Z"),
                "UTC",
                "Demo Bistro",
                "demo-restaurant",
                List.of("T1"),
                "cancel-token"
        );
    }
}
