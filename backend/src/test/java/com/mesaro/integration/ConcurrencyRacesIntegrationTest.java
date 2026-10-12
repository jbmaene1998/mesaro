package com.mesaro.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.auth.AuthRestaurantSummary;
import com.mesaro.planning.AssignStaffShiftRequest;
import com.mesaro.reservation.AdminReservationUpdateRequest;
import com.mesaro.reservation.Reservation;
import com.mesaro.reservation.ReservationRepository;
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
import com.mesaro.vacation.Vacation;
import com.mesaro.vacation.VacationReason;
import com.mesaro.vacation.VacationRepository;
import com.mesaro.vacation.VacationStatus;
import org.junit.jupiter.api.RepeatedTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ConcurrencyRacesIntegrationTest extends IntegrationTestBase {

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
    @Autowired
    private VacationRepository vacationRepository;
    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private ReservationRepository reservationRepository;

    @RepeatedTest(100)
    void vacationApproveRace_onlyOneApproveAudit() throws Exception {
        Restaurant restaurant = restaurantRepository.save(new Restaurant("Vac Race", "vac-race", "UTC"));
        UserAccount manager = userAccountRepository.save(new UserAccount("manager@example.com", "hash"));
        UserAccount staff = userAccountRepository.save(new UserAccount("staff@example.com", "hash"));
        userRestaurantRepository.save(new UserRestaurant(manager, restaurant, RestaurantRole.MANAGER));
        userRestaurantRepository.save(new UserRestaurant(staff, restaurant, RestaurantRole.STAFF));

        Vacation vacation = Vacation.createStaffVacation(
                restaurant,
                staff.getId(),
                VacationReason.PERSONAL,
                LocalDate.now(ZoneId.of("UTC")).plusDays(2),
                LocalDate.now(ZoneId.of("UTC")).plusDays(3)
        );
        vacation = vacationRepository.save(vacation);
        final long vacationId = vacation.getId();

        Authentication auth = authFor(manager.getId(), manager.getEmail(), List.of(
                new AuthRestaurantSummary(restaurant.getId(), RestaurantRole.MANAGER)
        ));

        CyclicBarrier barrier = new CyclicBarrier(2);
        List<Integer> statuses = runInParallel(2, () -> {
            barrier.await(5, TimeUnit.SECONDS);
            return mockMvc.perform(post("/api/vacations/{id}/approve", vacationId)
                            .with(SecurityMockMvcRequestPostProcessors.authentication(auth))
                            .contentType(MediaType.APPLICATION_JSON))
                    .andReturn()
                    .getResponse()
                    .getStatus();
        });

        long okCount = statuses.stream().filter(s -> s == 200).count();
        assertThat(okCount).isEqualTo(2); // idempotent success
        Vacation refreshed = vacationRepository.findById(vacationId).orElseThrow();
        assertThat(refreshed.getStatus()).isEqualTo(VacationStatus.APPROVED);

        Integer auditCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_event WHERE event_type = 'VACATION_APPROVED' AND restaurant_id = ?",
                Integer.class,
                restaurant.getId()
        );
        assertThat(auditCount).isEqualTo(1);
    }

    @RepeatedTest(50)
    void reservationLostUpdateRace_oneSucceeds_oneRejected() throws Exception {
        Restaurant restaurant = restaurantRepository.save(new Restaurant("Res Race", "res-race", "UTC"));
        DiningTable table = diningTableRepository.save(new DiningTable(restaurant, "T1", 4));
        LocalDate date = LocalDate.now(ZoneId.of("UTC")).plusDays(2);
        Shift shift = new Shift(restaurant, "Lunch", date.getDayOfWeek(),
                LocalTime.of(11, 0), LocalTime.of(15, 0), 50);
        shift.setStatus(ShiftStatus.ACTIVE);
        shift = shiftRepository.save(shift);

        Reservation reservation = new Reservation(
                restaurant,
                shift,
                "RES-RACE-" + System.nanoTime(),
                "Guest",
                "guest@example.com",
                2,
                date.atTime(12, 0).atZone(ZoneId.of("UTC")).toInstant(),
                date.atTime(13, 0).atZone(ZoneId.of("UTC")).toInstant()
        );
        reservation.addTable(table);
        reservation = reservationRepository.save(reservation);
        Long reservationId = reservation.getId();

        UserAccount staff = userAccountRepository.save(new UserAccount("staff-race@example.com", "hash"));
        userRestaurantRepository.save(new UserRestaurant(staff, restaurant, RestaurantRole.STAFF));
        Authentication auth = authFor(staff.getId(), staff.getEmail(), List.of(
                new AuthRestaurantSummary(restaurant.getId(), RestaurantRole.STAFF)
        ));

        String payload = objectMapper.writeValueAsString(new AdminReservationUpdateRequest(
                "Updated Guest", null, "555-0000", "note", null, null
        ));
        List<Integer> statuses = runInParallel(2, () -> mockMvc.perform(put("/api/admin/reservations/{id}", reservationId)
                        .with(SecurityMockMvcRequestPostProcessors.authentication(auth))
                        .param("restaurantId", restaurant.getId().toString())
                        .header("If-Match", "\"0\"")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andReturn()
                .getResponse()
                .getStatus());

        long success = statuses.stream().filter(s -> s == 200).count();
        long rejected = statuses.stream().filter(s -> s == 409 || s == 412).count();
        assertThat(success).isEqualTo(1);
        assertThat(rejected).isEqualTo(1);
    }

    @RepeatedTest(20)
    void crossRestaurantAssignmentRace_onlyOneAssignment() throws Exception {
        Restaurant r1 = restaurantRepository.save(new Restaurant("R1", "r1-" + System.nanoTime(), "UTC"));
        Restaurant r2 = restaurantRepository.save(new Restaurant("R2", "r2-" + System.nanoTime(), "UTC"));
        UserAccount manager = userAccountRepository.save(new UserAccount("manager-cross@example.com", "hash"));
        userRestaurantRepository.save(new UserRestaurant(manager, r1, RestaurantRole.MANAGER));
        userRestaurantRepository.save(new UserRestaurant(manager, r2, RestaurantRole.MANAGER));

        LocalDate date = LocalDate.now(ZoneId.of("UTC")).plusDays(2);
        Shift s1 = new Shift(r1, "A", date.getDayOfWeek(), LocalTime.of(10, 0), LocalTime.of(14, 0), 50);
        Shift s2 = new Shift(r2, "B", date.getDayOfWeek(), LocalTime.of(11, 0), LocalTime.of(15, 0), 50);
        s1.setStatus(ShiftStatus.ACTIVE);
        s2.setStatus(ShiftStatus.ACTIVE);
        s1 = shiftRepository.save(s1);
        s2 = shiftRepository.save(s2);

        Authentication auth = authFor(manager.getId(), manager.getEmail(), List.of(
                new AuthRestaurantSummary(r1.getId(), RestaurantRole.MANAGER),
                new AuthRestaurantSummary(r2.getId(), RestaurantRole.MANAGER)
        ));

        String req1 = objectMapper.writeValueAsString(new AssignStaffShiftRequest(s1.getId(), manager.getId(), date, null, null));
        String req2 = objectMapper.writeValueAsString(new AssignStaffShiftRequest(s2.getId(), manager.getId(), date, null, null));

        List<Integer> statuses = runInParallelWithLatch(
                () -> mockMvc.perform(post("/api/restaurants/{id}/staff-planning/assignments", r1.getId())
                                .with(SecurityMockMvcRequestPostProcessors.authentication(auth))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(req1))
                        .andReturn().getResponse().getStatus(),
                () -> mockMvc.perform(post("/api/restaurants/{id}/staff-planning/assignments", r2.getId())
                                .with(SecurityMockMvcRequestPostProcessors.authentication(auth))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(req2))
                        .andReturn().getResponse().getStatus()
        );

        long success = statuses.stream().filter(s -> s == 200).count();
        long conflict = statuses.stream().filter(s -> s == 409).count();
        assertThat(success).isEqualTo(1);
        assertThat(conflict).isEqualTo(1);
    }

    private Authentication authFor(Long userId, String email, List<AuthRestaurantSummary> restaurants) {
        List<RestaurantRoleAssignment> assignments = restaurants.stream()
                .map(summary -> new RestaurantRoleAssignment(summary.restaurantId(), summary.role()))
                .toList();
        AuthPrincipal principal = new AuthPrincipal(userId, email, restaurants, assignments);
        return new UsernamePasswordAuthenticationToken(principal, null, List.of());
    }

    private List<Integer> runInParallel(int workers, Callable<Integer> task) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(workers);
        try {
            List<Future<Integer>> futures = new ArrayList<>();
            for (int i = 0; i < workers; i++) {
                futures.add(executor.submit(task));
            }
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : futures) {
                statuses.add(future.get(20, TimeUnit.SECONDS));
            }
            return statuses;
        } finally {
            executor.shutdownNow();
        }
    }

    private List<Integer> runInParallelWithLatch(Callable<Integer> left, Callable<Integer> right) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<Integer> f1 = executor.submit(() -> {
                ready.countDown();
                start.await(5, TimeUnit.SECONDS);
                return left.call();
            });
            Future<Integer> f2 = executor.submit(() -> {
                ready.countDown();
                start.await(5, TimeUnit.SECONDS);
                return right.call();
            });
            ready.await(5, TimeUnit.SECONDS);
            start.countDown();
            return List.of(f1.get(20, TimeUnit.SECONDS), f2.get(20, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
        }
    }
}
