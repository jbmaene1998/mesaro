package com.mesaro.reservation;

import com.mesaro.common.ApiResponse;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.shift.Shift;
import com.mesaro.table.DiningTable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationControllerTest {

    @Mock
    private ReservationService reservationService;

    @Mock
    private RestaurantService restaurantService;

    private ReservationController controller;
    @BeforeEach
    void setUp() {
        controller = new ReservationController(reservationService, restaurantService);
    }

    @Test
    void getByConfirmationCode_returnsPublicSafeDto() {
        Reservation reservation = buildReservation("RES-2026-12345");
        when(reservationService.findByCodeAndCancelToken("RES-2026-12345", "cancel-token")).thenReturn(reservation);

        ApiResponse<PublicReservationResponse> response = controller.getByConfirmationCode(
                "RES-2026-12345",
                "cancel-token",
                null
        );

        assertThat(response.data()).isNotNull();
        assertThat(response.data().confirmationCode()).isEqualTo("RES-2026-12345");
        assertThat(response.data().partySize()).isEqualTo(4);
        assertThat(response.data().status()).isEqualTo(ReservationStatus.CONFIRMED);
        assertThat(response.data().tableLabels()).containsExactly("T1");
        assertThat(PublicReservationResponse.class.getRecordComponents())
                .extracting(component -> component.getName())
                .doesNotContain("guestEmail", "guestPhone", "notes", "guestName");
    }

    @Test
    void cancelByToken_returnsPublicSafeDto() {
        Reservation reservation = buildReservation("RES-2026-98765");
        when(reservationService.cancelByCodeAndToken("RES-2026-98765", "cancel-token")).thenReturn(reservation);

        ApiResponse<PublicReservationResponse> response = controller.cancelByToken(
                "RES-2026-98765",
                "cancel-token",
                null
        );

        assertThat(response.data()).isNotNull();
        assertThat(response.data().confirmationCode()).isEqualTo("RES-2026-98765");
        assertThat(response.message()).isEqualTo("Reservation cancelled");
        assertThat(PublicReservationResponse.class.getRecordComponents())
                .extracting(component -> component.getName())
                .doesNotContain("guestEmail", "guestPhone", "notes", "guestName");
    }

    private Reservation buildReservation(String confirmationCode) {
        Restaurant restaurant = new Restaurant("Demo", "demo", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);

        Shift shift = new Shift(restaurant, "Dinner", DayOfWeek.MONDAY,
                LocalTime.of(18, 0), LocalTime.of(22, 0), 100);

        Reservation reservation = new Reservation(
                restaurant,
                shift,
                confirmationCode,
                "Alice Johnson",
                "alice@example.com",
                4,
                Instant.parse("2026-01-10T18:00:00Z"),
                Instant.parse("2026-01-10T19:30:00Z")
        );
        reservation.setGuestPhone("+1-555-555-0101");
        reservation.setNotes("Birthday table");
        reservation.addTable(new DiningTable(restaurant, "T1", 4));
        return reservation;
    }
}
