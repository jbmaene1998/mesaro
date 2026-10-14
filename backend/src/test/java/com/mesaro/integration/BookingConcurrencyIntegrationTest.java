package com.mesaro.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.auth.AuthRestaurantSummary;
import com.mesaro.reservation.AdminReservationCreateRequest;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantRepository;
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.RepeatedTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BookingConcurrencyIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private DiningTableRepository diningTableRepository;

    @Autowired
    private ShiftRepository shiftRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private UserRestaurantRepository userRestaurantRepository;

    @RepeatedTest(50)
    void concurrentHoldRequests_sameSlot_onlyOneSucceeds() throws Exception {
        Restaurant restaurantDraft = new Restaurant("Race Hold", "race-hold", "UTC");
        restaurantDraft.setBookingEnabled(true);
        Restaurant restaurant = restaurantRepository.save(restaurantDraft);
        attachBillableOwner(restaurant);
        diningTableRepository.save(new DiningTable(restaurant, "T1", 2));

        LocalDate date = LocalDate.now(ZoneId.of("UTC")).plusDays(1);
        LocalTime time = LocalTime.of(12, 0);
        Shift shift = new Shift(restaurant, "Lunch", date.getDayOfWeek(),
                LocalTime.of(11, 0), LocalTime.of(15, 0), 50);
        shift.setStatus(ShiftStatus.ACTIVE);
        shiftRepository.save(shift);

        var payload = objectMapper.writeValueAsString(
                new com.mesaro.hold.CreateHoldRequest(restaurant.getSlug(), date, time, 2)
        );

        List<Integer> statuses = runInParallel(8, () -> mockMvc.perform(post("/api/holds")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andReturn()
                .getResponse()
                .getStatus());

        long successCount = statuses.stream().filter(status -> status == 200).count();
        long conflictCount = statuses.stream().filter(status -> status == 409).count();

        assertThat(successCount).isEqualTo(1);
        assertThat(conflictCount).isEqualTo(7);
    }

    @RepeatedTest(3)
    void concurrentWalkInAtCapacityBoundary_onlyOneSucceeds() throws Exception {
        Restaurant restaurantDraft = new Restaurant("Race Capacity", "race-capacity", "UTC");
        restaurantDraft.setBookingEnabled(true);
        Restaurant restaurant = restaurantRepository.save(restaurantDraft);
        attachBillableOwner(restaurant);
        diningTableRepository.save(new DiningTable(restaurant, "T1", 2));
        diningTableRepository.save(new DiningTable(restaurant, "T2", 2));

        LocalDate date = LocalDate.now(ZoneId.of("UTC")).plusDays(1);
        LocalTime time = LocalTime.of(12, 0);
        Shift shift = new Shift(restaurant, "Lunch", date.getDayOfWeek(),
                LocalTime.of(11, 0), LocalTime.of(15, 0), 2);
        shift.setStatus(ShiftStatus.ACTIVE);
        shiftRepository.save(shift);

        UserAccount manager = userAccountRepository.save(new UserAccount("manager.race@example.com", "hash"));
        userRestaurantRepository.save(new UserRestaurant(manager, restaurant, RestaurantRole.MANAGER));
        Authentication auth = authFor(manager.getId(), manager.getEmail(), restaurant.getId(), RestaurantRole.MANAGER);

        AdminReservationCreateRequest request = new AdminReservationCreateRequest(
                date,
                time,
                2,
                "Walk-in Guest",
                "walkin@example.com",
                "555-0100",
                "race test",
                null,
                null,
                null,
                null
        );
        String payload = objectMapper.writeValueAsString(request);

        String restaurantId = restaurant.getId().toString();
        List<Integer> statuses = runInParallel(2, () -> mockMvc.perform(post("/api/admin/reservations")
                        .with(authentication(auth))
                        .param("restaurantId", restaurantId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andReturn()
                .getResponse()
                .getStatus());

        long successCount = statuses.stream().filter(status -> status == 200).count();
        long conflictCount = statuses.stream().filter(status -> status == 409).count();

        assertThat(successCount).isEqualTo(1);
        assertThat(conflictCount).isEqualTo(1);
    }

    private Authentication authFor(Long userId, String email, Long restaurantId, RestaurantRole role) {
        AuthRestaurantSummary summary = new AuthRestaurantSummary(restaurantId, role);
        RestaurantRoleAssignment assignment = new RestaurantRoleAssignment(restaurantId, role);
        AuthPrincipal principal = new AuthPrincipal(userId, email, List.of(summary), List.of(assignment));
        return new UsernamePasswordAuthenticationToken(principal, null, List.of());
    }

    private List<Integer> runInParallel(int workers, Callable<Integer> task) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(workers);
        CountDownLatch ready = new CountDownLatch(workers);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Callable<Integer>> calls = new ArrayList<>();
            for (int i = 0; i < workers; i++) {
                calls.add(() -> {
                    ready.countDown();
                    start.await(5, TimeUnit.SECONDS);
                    return task.call();
                });
            }
            List<Future<Integer>> futures = new ArrayList<>();
            for (Callable<Integer> call : calls) {
                futures.add(executor.submit(call));
            }
            ready.await(5, TimeUnit.SECONDS);
            start.countDown();

            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : futures) {
                statuses.add(future.get(20, TimeUnit.SECONDS));
            }
            return statuses;
        } finally {
            executor.shutdownNow();
        }
    }
}
