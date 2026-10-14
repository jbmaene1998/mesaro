package com.mesaro.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.hold.HoldService;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantRepository;
import com.mesaro.shift.Shift;
import com.mesaro.shift.ShiftRepository;
import com.mesaro.shift.ShiftStatus;
import com.mesaro.table.DiningTable;
import com.mesaro.table.DiningTableRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HoldConfirmCleanupRaceIntegrationTest extends IntegrationTestBase {

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
    private HoldService holdService;
    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private DataSource dataSource;

    @Test
    void cleanupSkipsLockedHoldDuringConfirm() throws Exception {
        Restaurant restaurant = new Restaurant("Confirm Race", "confirm-race-" + System.nanoTime(), "UTC");
        restaurant.setBookingEnabled(true);
        restaurant = restaurantRepository.save(restaurant);
        attachBillableOwner(restaurant);
        diningTableRepository.save(new DiningTable(restaurant, "T1", 2));
        LocalDate date = LocalDate.now(ZoneId.of("UTC")).plusDays(1);
        Shift shift = new Shift(restaurant, "Lunch", date.getDayOfWeek(), LocalTime.of(11, 0), LocalTime.of(15, 0), 50);
        shift.setStatus(ShiftStatus.ACTIVE);
        shiftRepository.save(shift);

        String holdPayload = """
                {"restaurantSlug":"%s","date":"%s","time":"12:00","partySize":2}
                """.formatted(restaurant.getSlug(), date);
        String holdResponse = mockMvc.perform(post("/api/holds")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(holdPayload))
                .andReturn().getResponse().getContentAsString();
        JsonNode holdJson = objectMapper.readTree(holdResponse);
        String holdToken = holdJson.path("data").path("holdToken").asText();
        assertThat(holdToken).isNotBlank();

        jdbcTemplate.update("UPDATE hold SET expires_at_utc = now() - interval '1 minute' WHERE confirmed = false");

        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try (PreparedStatement statement = connection.prepareStatement(
                    "SELECT id FROM hold WHERE confirmed = false FOR UPDATE")) {
                try (ResultSet rows = statement.executeQuery()) {
                    assertThat(rows.next()).isTrue();
                }
                int deleted = holdService.cleanupExpiredHolds();
                Integer holdCountWhileLocked = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM hold WHERE confirmed = false",
                        Integer.class
                );
                assertThat(deleted).isEqualTo(0);
                assertThat(holdCountWhileLocked).isEqualTo(1);
            } finally {
                connection.rollback();
            }
        }

        String confirmPayload = """
                {"guestName":"Race Guest","guestEmail":"race@example.com","guestPhone":"555-0000","notes":"test"}
                """;
        int confirmStatus = mockMvc.perform(post("/api/holds/{token}/confirm", holdToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(confirmPayload))
                .andReturn().getResponse().getStatus();
        assertThat(confirmStatus == 404 || confirmStatus == 409).isTrue();
    }
}
