package com.mesaro.integration;

import com.mesaro.common.exception.ConflictException;
import com.mesaro.hold.CreateHoldRequest;
import com.mesaro.hold.HoldService;
import com.mesaro.reservation.ConfirmHoldRequest;
import com.mesaro.reservation.ReservationService;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantRepository;
import com.mesaro.security.RestaurantRole;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class HoldConcurrencyTest extends IntegrationTestBase {

    @Autowired
    private HoldService holdService;
    @Autowired
    private ReservationService reservationService;
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

    @Test
    void holdCreationAndConfirmationConcurrentlyDoNotDeadlock() throws Exception {
        Restaurant restaurant = restaurantRepository.save(new Restaurant("Hold Concurrency", "hold-concurrency-" + System.nanoTime(), "UTC"));
        attachOwner(restaurant);
        DiningTable table1 = diningTableRepository.save(new DiningTable(restaurant, "T1", 2));
        diningTableRepository.save(new DiningTable(restaurant, "T2", 8));

        LocalDate date = LocalDate.now(ZoneId.of("UTC")).plusDays(1);
        Shift shift = new Shift(restaurant, "Lunch", date.getDayOfWeek(), LocalTime.of(11, 0), LocalTime.of(15, 0), 20);
        shift.setStatus(ShiftStatus.ACTIVE);
        shiftRepository.save(shift);

        HoldService.HoldWithToken preCreated = holdService.createHold(
                new CreateHoldRequest(restaurant.getSlug(), date, LocalTime.of(12, 0), 8)
        );
        String holdToken = preCreated.token();

        int threads = 20;
        ExecutorService exec = Executors.newFixedThreadPool(threads);
        AtomicInteger deadlockCount = new AtomicInteger(0);
        CountDownLatch latch = new CountDownLatch(threads);

        List<Runnable> tasks = new ArrayList<>();
        for (int i = 0; i < threads / 2; i++) {
            tasks.add(() -> {
                try {
                    holdService.createHold(new CreateHoldRequest(restaurant.getSlug(), date, LocalTime.of(12, 0), 2));
                } catch (Exception e) {
                    if (isDeadlockError(e)) {
                        deadlockCount.incrementAndGet();
                    }
                } finally {
                    latch.countDown();
                }
            });
            tasks.add(() -> {
                try {
                    reservationService.confirm(holdToken, new ConfirmHoldRequest("Guest", "guest@example.com", "555-0000", null));
                } catch (Exception e) {
                    if (isDeadlockError(e)) {
                        deadlockCount.incrementAndGet();
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        try {
            tasks.forEach(exec::submit);
            assertTrue(latch.await(30, TimeUnit.SECONDS), "Timed out waiting for threads");
        } finally {
            exec.shutdownNow();
        }

        assertThat(deadlockCount.get()).isZero();
        assertThat(table1.getId()).isNotNull();
    }

    @Test
    void concurrentHoldsNeverExceedShiftMaxCovers() throws Exception {
        Restaurant restaurant = restaurantRepository.save(new Restaurant("Capacity Concurrency", "capacity-concurrency-" + System.nanoTime(), "UTC"));
        attachOwner(restaurant);
        for (int i = 1; i <= 10; i++) {
            diningTableRepository.save(new DiningTable(restaurant, "T" + i, 10));
        }

        LocalDate date = LocalDate.now(ZoneId.of("UTC")).plusDays(1);
        Shift shift = new Shift(restaurant, "Dinner", date.getDayOfWeek(), LocalTime.of(18, 0), LocalTime.of(23, 0), 4);
        shift.setStatus(ShiftStatus.ACTIVE);
        shiftRepository.save(shift);

        int threads = 10;
        AtomicInteger successCount = new AtomicInteger(0);
        ExecutorService exec = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);

        try {
            for (int i = 0; i < threads; i++) {
                exec.submit(() -> {
                    try {
                        holdService.createHold(new CreateHoldRequest(restaurant.getSlug(), date, LocalTime.of(19, 0), 1));
                        successCount.incrementAndGet();
                    } catch (ConflictException ignored) {
                        // Expected when requests exceed shift capacity.
                    } finally {
                        latch.countDown();
                    }
                });
            }
            assertTrue(latch.await(30, TimeUnit.SECONDS), "Timed out waiting for threads");
        } finally {
            exec.shutdownNow();
        }

        assertThat(successCount.get()).isLessThanOrEqualTo(4);
    }

    private void attachOwner(Restaurant restaurant) {
        UserAccount owner = userAccountRepository.save(
                new UserAccount("owner-" + restaurant.getSlug() + "@example.com", "hash")
        );
        userRestaurantRepository.save(new UserRestaurant(owner, restaurant, RestaurantRole.OWNER));
    }

    private boolean isDeadlockError(Exception e) {
        Throwable current = e;
        while (current != null) {
            String msg = current.getMessage();
            if (msg != null) {
                String normalized = msg.toLowerCase();
                if (normalized.contains("deadlock") || normalized.contains("40p01")) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }
}
