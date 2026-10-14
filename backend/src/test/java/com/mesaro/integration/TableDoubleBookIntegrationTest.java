package com.mesaro.integration;

import com.mesaro.common.exception.ConflictException;
import com.mesaro.hold.CreateHoldRequest;
import com.mesaro.hold.HoldService;
import com.mesaro.reservation.AdminReservationCreateRequest;
import com.mesaro.reservation.ConfirmHoldRequest;
import com.mesaro.reservation.ConfirmationResult;
import com.mesaro.reservation.ReservationAdminService;
import com.mesaro.reservation.ReservationService;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantRepository;
import com.mesaro.auth.AuthRestaurantSummary;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class TableDoubleBookIntegrationTest extends IntegrationTestBase {

    @Autowired
    private HoldService holdService;
    @Autowired
    private ReservationService reservationService;
    @Autowired
    private ReservationAdminService reservationAdminService;
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
    private JdbcTemplate jdbcTemplate;

    @Test
    void secondOverlappingHoldOnSameTableIsRejected() {
        Fixture fixture = createFixture("double-hold");

        HoldService.HoldWithToken first = holdService.createHold(
                new CreateHoldRequest(fixture.restaurant().getSlug(), fixture.date(), LocalTime.of(19, 0), 2));
        assertThat(first.hold().getTables()).hasSize(1);

        assertThatThrownBy(() -> holdService.createHold(
                new CreateHoldRequest(fixture.restaurant().getSlug(), fixture.date(), LocalTime.of(19, 30), 2)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void confirmedReservationBlocksOverlappingHoldOnSameTable() {
        Fixture fixture = createFixture("res-blocks-hold");

        HoldService.HoldWithToken hold = holdService.createHold(
                new CreateHoldRequest(fixture.restaurant().getSlug(), fixture.date(), LocalTime.of(19, 0), 2));
        reservationService.confirm(hold.token(), new ConfirmHoldRequest("Guest A", "a@example.com", null, null));

        assertThatThrownBy(() -> holdService.createHold(
                new CreateHoldRequest(fixture.restaurant().getSlug(), fixture.date(), LocalTime.of(19, 30), 2)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void confirmSucceedsAfterReleasingOwnHoldTables() {
        Fixture fixture = createFixture("confirm-release");

        HoldService.HoldWithToken hold = holdService.createHold(
                new CreateHoldRequest(fixture.restaurant().getSlug(), fixture.date(), LocalTime.of(19, 0), 2));

        ConfirmationResult result = reservationService.confirm(
                hold.token(), new ConfirmHoldRequest("Guest", "guest@example.com", null, null));

        assertThat(result.confirmationCode()).isNotBlank();
        Integer reservationLinks = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM reservation_table rt
                JOIN reservation r ON r.id = rt.reservation_id
                WHERE r.confirmation_code = ?
                  AND rt.table_id = ?
                  AND r.status = 'CONFIRMED'
                """, Integer.class, result.confirmationCode(), fixture.table().getId());
        assertThat(reservationLinks).isEqualTo(1);
        Integer holdTableLinks = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM hold_table WHERE hold_id = ?", Integer.class, hold.hold().getId());
        assertThat(holdTableLinks).isZero();
    }

    @Test
    void dbTriggerBlocksReservationInsertWhileActiveHoldExists() {
        Fixture fixture = createFixture("trigger-hold");

        HoldService.HoldWithToken hold = holdService.createHold(
                new CreateHoldRequest(fixture.restaurant().getSlug(), fixture.date(), LocalTime.of(19, 0), 2));

        Long reservationId = insertForcedReservation(
                fixture.restaurant().getId(),
                hold.hold().getShift().getId(),
                "TRIG-HOLD",
                hold.hold().getStartAtUtc(),
                hold.hold().getEndAtUtc());

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO reservation_table (reservation_id, table_id) VALUES (?, ?)",
                reservationId, fixture.table().getId()))
                .hasMessageContaining("already held");
    }

    @Test
    void dbTriggerBlocksOverlappingConfirmedReservationsOnSameTable() {
        Fixture fixture = createFixture("trigger-res");

        HoldService.HoldWithToken hold = holdService.createHold(
                new CreateHoldRequest(fixture.restaurant().getSlug(), fixture.date(), LocalTime.of(19, 0), 2));
        ConfirmationResult first = reservationService.confirm(
                hold.token(), new ConfirmHoldRequest("Guest A", "a@example.com", null, null));

        Long reservationId = insertForcedReservation(
                fixture.restaurant().getId(),
                hold.hold().getShift().getId(),
                "TRIG-RES",
                hold.hold().getStartAtUtc().plusSeconds(30 * 60),
                hold.hold().getEndAtUtc().plusSeconds(30 * 60));
        assertThat(first.confirmationCode()).isNotBlank();

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO reservation_table (reservation_id, table_id) VALUES (?, ?)",
                reservationId, fixture.table().getId()))
                .hasMessageContaining("already reserved");
    }

    @Test
    void concurrentConfirmsOnSameTableProduceOnlyOneReservation() throws Exception {
        Fixture fixture = createFixture("concurrent-confirm");

        // Two tables so both holds can be created; then force both onto the same table via JDBC.
        DiningTable table2 = diningTableRepository.save(new DiningTable(fixture.restaurant(), "T2", 2));
        HoldService.HoldWithToken holdA = holdService.createHold(
                new CreateHoldRequest(fixture.restaurant().getSlug(), fixture.date(), LocalTime.of(19, 0), 2));
        HoldService.HoldWithToken holdB = holdService.createHold(
                new CreateHoldRequest(fixture.restaurant().getSlug(), fixture.date(), LocalTime.of(19, 0), 2));

        Long tableA = holdA.hold().getTables().iterator().next().getId();
        Long tableB = holdB.hold().getTables().iterator().next().getId();
        assertThat(tableA).isNotEqualTo(tableB);

        Long sharedTableId = fixture.table().getId();
        jdbcTemplate.update("DELETE FROM hold_table WHERE hold_id IN (?, ?)", holdA.hold().getId(), holdB.hold().getId());
        jdbcTemplate.execute("ALTER TABLE hold_table DISABLE TRIGGER trg_hold_table_no_overlap");
        try {
            jdbcTemplate.update("INSERT INTO hold_table (hold_id, table_id) VALUES (?, ?)", holdA.hold().getId(), sharedTableId);
            jdbcTemplate.update("INSERT INTO hold_table (hold_id, table_id) VALUES (?, ?)", holdB.hold().getId(), sharedTableId);
        } finally {
            jdbcTemplate.execute("ALTER TABLE hold_table ENABLE TRIGGER trg_hold_table_no_overlap");
        }
        assertThat(table2.getId()).isNotNull();

        AtomicInteger success = new AtomicInteger();
        AtomicInteger conflict = new AtomicInteger();
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService exec = Executors.newFixedThreadPool(2);
        try {
            Future<?> f1 = exec.submit(() -> confirmRacing(holdA.token(), start, success, conflict));
            Future<?> f2 = exec.submit(() -> confirmRacing(holdB.token(), start, success, conflict));
            start.countDown();
            f1.get(30, TimeUnit.SECONDS);
            f2.get(30, TimeUnit.SECONDS);
        } finally {
            exec.shutdownNow();
        }

        assertThat(success.get() + conflict.get()).isEqualTo(2);
        assertThat(success.get()).isLessThanOrEqualTo(1);
        Integer activeOnTable = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM reservation_table rt
                JOIN reservation r ON r.id = rt.reservation_id
                WHERE rt.table_id = ?
                  AND r.status IN ('CONFIRMED', 'SEATED')
                """, Integer.class, sharedTableId);
        assertThat(activeOnTable).isEqualTo(success.get());
    }

    @Test
    void walkInCannotDoubleBookTableAlreadyHeld() {
        Fixture fixture = createFixture("walkin-vs-hold");
        UserAccount owner = attachOwner(fixture.restaurant());
        SecurityContextHolder.getContext().setAuthentication(authFor(owner, fixture.restaurant().getId()));

        holdService.createHold(
                new CreateHoldRequest(fixture.restaurant().getSlug(), fixture.date(), LocalTime.of(19, 0), 2));

        AdminReservationCreateRequest walkIn = new AdminReservationCreateRequest(
                fixture.date(),
                LocalTime.of(19, 0),
                2,
                "Walk-in Guest",
                "walkin@example.com",
                null,
                null,
                120,
                List.of(fixture.table().getId()),
                null,
                false
        );

        try {
            assertThatThrownBy(() -> reservationAdminService.createWalkIn(
                    fixture.restaurant().getId(), walkIn, owner.getId()))
                    .isInstanceOf(ConflictException.class);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void confirmRacing(String token,
                               CountDownLatch start,
                               AtomicInteger success,
                               AtomicInteger conflict) {
        try {
            start.await(10, TimeUnit.SECONDS);
            reservationService.confirm(token, new ConfirmHoldRequest("Guest", "race@example.com", null, null));
            success.incrementAndGet();
        } catch (ConflictException ex) {
            conflict.incrementAndGet();
        } catch (Exception ex) {
            Throwable cursor = ex;
            while (cursor != null) {
                if (cursor instanceof ConflictException
                        || (cursor.getMessage() != null
                        && (cursor.getMessage().contains("already reserved")
                        || cursor.getMessage().contains("already held")
                        || cursor.getMessage().contains("no longer available")))) {
                    conflict.incrementAndGet();
                    return;
                }
                cursor = cursor.getCause();
            }
            throw new RuntimeException(ex);
        }
    }

    private Long insertForcedReservation(Long restaurantId,
                                         Long shiftId,
                                         String code,
                                         java.time.Instant startUtc,
                                         java.time.Instant endUtc) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO reservation (
                    restaurant_id, shift_id, confirmation_code, guest_name, guest_email,
                    party_size, start_at_utc, end_at_utc, status, version, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, 'Forced', 'forced@example.com',
                    2, ?, ?, 'CONFIRMED', 0, NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC'
                ) RETURNING id
                """, Long.class,
                restaurantId,
                shiftId,
                code,
                java.sql.Timestamp.from(startUtc),
                java.sql.Timestamp.from(endUtc));
    }

    private Fixture createFixture(String slugPrefix) {
        Restaurant restaurantDraft = new Restaurant(
                "Gaspard Double Book",
                slugPrefix + "-" + System.nanoTime(),
                "Europe/Brussels");
        restaurantDraft.setBookingEnabled(true);
        restaurantDraft.setDefaultDurationMinutes(120);
        Restaurant restaurant = restaurantRepository.save(restaurantDraft);
        attachOwner(restaurant);
        DiningTable table = diningTableRepository.save(new DiningTable(restaurant, "T1", 2));

        LocalDate date = LocalDate.now(ZoneId.of("Europe/Brussels")).plusDays(1);
        Shift shift = new Shift(restaurant, "Dinner", date.getDayOfWeek(),
                LocalTime.of(17, 0), LocalTime.of(23, 0), 40);
        shift.setStatus(ShiftStatus.ACTIVE);
        shiftRepository.save(shift);
        return new Fixture(restaurant, table, date);
    }

    private UserAccount attachOwner(Restaurant restaurant) {
        UserAccount user = new UserAccount("owner-" + System.nanoTime() + "@example.com", "hash");
        user = userAccountRepository.save(user);
        userRestaurantRepository.save(new UserRestaurant(user, restaurant, RestaurantRole.OWNER));
        return user;
    }

    private Authentication authFor(UserAccount user, Long restaurantId) {
        AuthRestaurantSummary summary = new AuthRestaurantSummary(restaurantId, RestaurantRole.OWNER);
        RestaurantRoleAssignment assignment = new RestaurantRoleAssignment(restaurantId, RestaurantRole.OWNER);
        AuthPrincipal principal = new AuthPrincipal(
                user.getId(), user.getEmail(), List.of(summary), List.of(assignment));
        return new UsernamePasswordAuthenticationToken(principal, null, List.of());
    }

    private record Fixture(Restaurant restaurant, DiningTable table, LocalDate date) {
    }
}
