package com.mesaro.integration;

import com.mesaro.auth.AuthRestaurantSummary;
import com.mesaro.reservation.Reservation;
import com.mesaro.reservation.ReservationRepository;
import com.mesaro.security.AuthPrincipal;
import com.mesaro.security.RestaurantRole;
import com.mesaro.security.RestaurantRoleAssignment;
import com.mesaro.shift.Shift;
import com.mesaro.shift.ShiftRepository;
import com.mesaro.shift.ShiftStatus;
import com.mesaro.table.DiningTable;
import com.mesaro.table.DiningTableRepository;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserRestaurant;
import com.mesaro.user.UserRestaurantRepository;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TenantIsolationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private RestaurantRepository restaurantRepository;
    @Autowired
    private DiningTableRepository diningTableRepository;
    @Autowired
    private ShiftRepository shiftRepository;
    @Autowired
    private ReservationRepository reservationRepository;
    @Autowired
    private UserAccountRepository userAccountRepository;
    @Autowired
    private UserRestaurantRepository userRestaurantRepository;

    @Test
    void staffOfRestaurantOneCannotReadReservationsOfRestaurantTwo() throws Exception {
        Fixture fixture = createFixture();
        Authentication staffR1Auth = authFor(fixture.staffR1, fixture.r1.getId(), RestaurantRole.STAFF);

        mockMvc.perform(get("/api/admin/reservations")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(staffR1Auth))
                        .param("restaurantId", fixture.r2.getId().toString()))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerOfRestaurantOneCannotCancelReservationOfRestaurantTwo() throws Exception {
        Fixture fixture = createFixture();
        Authentication managerR1Auth = authFor(fixture.managerR1, fixture.r1.getId(), RestaurantRole.MANAGER);

        mockMvc.perform(post("/api/admin/reservations/{id}/cancel", fixture.reservationInR2.getId())
                        .with(SecurityMockMvcRequestPostProcessors.authentication(managerR1Auth))
                        .param("restaurantId", fixture.r2.getId().toString())
                        .header("If-Match", "\"0\""))
                .andExpect(status().isForbidden());
    }

    @Test
    void staffOfRestaurantOneCannotReadDashboardStatsOfRestaurantTwo() throws Exception {
        Fixture fixture = createFixture();
        Authentication staffR1Auth = authFor(fixture.staffR1, fixture.r1.getId(), RestaurantRole.STAFF);

        mockMvc.perform(get("/api/stats/daily")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(staffR1Auth))
                        .param("restaurantId", fixture.r2.getId().toString()))
                .andExpect(status().isForbidden());
    }

    private Fixture createFixture() {
        Restaurant r1 = restaurantRepository.save(new Restaurant("R1", "r1-" + System.nanoTime(), "UTC"));
        Restaurant r2 = restaurantRepository.save(new Restaurant("R2", "r2-" + System.nanoTime(), "UTC"));

        UserAccount staffR1 = userAccountRepository.save(new UserAccount("staff-r1@example.com", "hash"));
        UserAccount managerR1 = userAccountRepository.save(new UserAccount("manager-r1@example.com", "hash"));
        userRestaurantRepository.save(new UserRestaurant(staffR1, r1, RestaurantRole.STAFF));
        userRestaurantRepository.save(new UserRestaurant(managerR1, r1, RestaurantRole.MANAGER));

        DiningTable tableR2 = diningTableRepository.save(new DiningTable(r2, "R2-T1", 4));
        LocalDate date = LocalDate.now(ZoneId.of("UTC")).plusDays(1);
        Shift shiftR2 = new Shift(r2, "Dinner", date.getDayOfWeek(), LocalTime.of(18, 0), LocalTime.of(22, 0), 50);
        shiftR2.setStatus(ShiftStatus.ACTIVE);
        shiftR2 = shiftRepository.save(shiftR2);

        Reservation reservationInR2 = new Reservation(
                r2,
                shiftR2,
                "RES-R2-" + System.nanoTime(),
                "Guest R2",
                "guest-r2@example.com",
                2,
                date.atTime(19, 0).atZone(ZoneId.of("UTC")).toInstant(),
                date.atTime(20, 0).atZone(ZoneId.of("UTC")).toInstant()
        );
        reservationInR2.addTable(tableR2);
        reservationInR2 = reservationRepository.save(reservationInR2);

        return new Fixture(r1, r2, staffR1, managerR1, reservationInR2);
    }

    private Authentication authFor(UserAccount user, Long restaurantId, RestaurantRole role) {
        AuthRestaurantSummary summary = new AuthRestaurantSummary(restaurantId, role);
        RestaurantRoleAssignment assignment = new RestaurantRoleAssignment(restaurantId, role);
        AuthPrincipal principal = new AuthPrincipal(user.getId(), user.getEmail(), List.of(summary), List.of(assignment));
        return new UsernamePasswordAuthenticationToken(principal, null, List.of());
    }

    private record Fixture(Restaurant r1, Restaurant r2, UserAccount staffR1, UserAccount managerR1,
                           Reservation reservationInR2) {
    }
}
