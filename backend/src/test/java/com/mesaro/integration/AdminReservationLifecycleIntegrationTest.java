package com.mesaro.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.audit.AuditEventEntity;
import com.mesaro.audit.AuditEventRepository;
import com.mesaro.audit.AuditEventType;
import com.mesaro.auth.AuthRestaurantSummary;
import com.mesaro.reservation.AdminReservationCreateRequest;
import com.mesaro.security.AuthPrincipal;
import com.mesaro.security.RestaurantRole;
import com.mesaro.security.RestaurantRoleAssignment;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantRepository;
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
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminReservationLifecycleIntegrationTest extends IntegrationTestBase {

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
    private AuditEventRepository auditEventRepository;

    @Test
    void adminReservationLifecycle_create_seat_complete() throws Exception {
        Restaurant restaurant = restaurantRepository.save(new Restaurant("Test", "test", "UTC"));

        DiningTable table = new DiningTable(restaurant, "T1", 4);
        diningTableRepository.save(table);

        LocalDate date = LocalDate.now(ZoneId.of("UTC")).plusDays(1);
        LocalTime time = LocalTime.of(12, 0);

        Shift shift = new Shift(restaurant, "Lunch", date.getDayOfWeek(),
                LocalTime.of(11, 0), LocalTime.of(15, 0), 50);
        shift.setStatus(ShiftStatus.ACTIVE);
        shiftRepository.save(shift);

        UserAccount staff = userAccountRepository.save(new UserAccount("staff@example.com", "hash"));
        userRestaurantRepository.save(new UserRestaurant(staff, restaurant, RestaurantRole.MANAGER));

        Authentication auth = authFor(staff.getId(), staff.getEmail(), restaurant.getId(), RestaurantRole.MANAGER);

        AdminReservationCreateRequest createRequest = new AdminReservationCreateRequest(
                date,
                time,
                2,
                "Walk-in Guest",
                "guest@example.com",
                "555-0100",
                "Notes",
                null,
                null,
                null,
                null
        );

        MvcResult createResult = mockMvc.perform(post("/api/admin/reservations")
                        .with(authentication(auth))
                        .param("restaurantId", restaurant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"))
                .andReturn();

        JsonNode createJson = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long reservationId = createJson.path("data").path("id").asLong();

        mockMvc.perform(post("/api/admin/reservations/{id}/seat", reservationId)
                        .with(authentication(auth))
                        .param("restaurantId", restaurant.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SEATED"));

        mockMvc.perform(post("/api/admin/reservations/{id}/complete", reservationId)
                        .with(authentication(auth))
                        .param("restaurantId", restaurant.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        List<AuditEventEntity> events = auditEventRepository.findByRestaurantIdAndEventTypeInOrderByIdAsc(
                restaurant.getId(),
                List.of(
                        AuditEventType.RESERVATION_CREATED,
                        AuditEventType.RESERVATION_SEATED,
                        AuditEventType.RESERVATION_COMPLETED
                )
        );

        assertThat(events).hasSize(3);
        assertThat(events)
                .extracting(AuditEventEntity::getEventType)
                .containsExactly(
                        AuditEventType.RESERVATION_CREATED,
                        AuditEventType.RESERVATION_SEATED,
                        AuditEventType.RESERVATION_COMPLETED
                );
        assertThat(events)
                .extracting(AuditEventEntity::getActorUserId)
                .containsOnly(staff.getId());
    }

    @Test
    void walkIn_createWithSeatImmediately_setsSeatedStatus() throws Exception {
        Restaurant restaurant = restaurantRepository.save(new Restaurant("Test Seat", "test-seat", "UTC"));

        DiningTable table = new DiningTable(restaurant, "T1", 4);
        diningTableRepository.save(table);

        LocalDate date = LocalDate.now(ZoneId.of("UTC")).plusDays(1);
        LocalTime time = LocalTime.of(12, 0);

        Shift shift = new Shift(restaurant, "Lunch", date.getDayOfWeek(),
                LocalTime.of(11, 0), LocalTime.of(15, 0), 50);
        shift.setStatus(ShiftStatus.ACTIVE);
        shiftRepository.save(shift);

        UserAccount staff = userAccountRepository.save(new UserAccount("staff-seat@example.com", "hash"));
        userRestaurantRepository.save(new UserRestaurant(staff, restaurant, RestaurantRole.MANAGER));

        Authentication auth = authFor(staff.getId(), staff.getEmail(), restaurant.getId(), RestaurantRole.MANAGER);

        AdminReservationCreateRequest createRequest = new AdminReservationCreateRequest(
                date,
                time,
                2,
                "Walk-in Guest",
                null,
                "555-0100",
                "Notes",
                null,
                List.of(table.getId()),
                null,
                true
        );

        mockMvc.perform(post("/api/admin/reservations")
                        .with(authentication(auth))
                        .param("restaurantId", restaurant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SEATED"))
                .andExpect(jsonPath("$.data.guestEmail").value(""));
    }

    private Authentication authFor(Long userId, String email, Long restaurantId, RestaurantRole role) {
        AuthRestaurantSummary summary = new AuthRestaurantSummary(restaurantId, role);
        RestaurantRoleAssignment assignment = new RestaurantRoleAssignment(restaurantId, role);
        AuthPrincipal principal = new AuthPrincipal(userId, email, List.of(summary), List.of(assignment));
        return new UsernamePasswordAuthenticationToken(principal, null, List.of());
    }
}
