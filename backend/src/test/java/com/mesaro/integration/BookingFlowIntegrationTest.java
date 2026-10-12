package com.mesaro.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.hold.CreateHoldRequest;
import com.mesaro.reservation.ConfirmHoldRequest;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BookingFlowIntegrationTest extends IntegrationTestBase {

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

    @Test
    void fullBookingFlow_createsHold_confirms_and_cancels() throws Exception {
        Restaurant restaurant = restaurantRepository.save(new Restaurant("Test", "test", "UTC"));

        DiningTable table = new DiningTable(restaurant, "T1", 4);
        diningTableRepository.save(table);

        LocalDate date = LocalDate.now(ZoneId.of("UTC")).plusDays(1);
        LocalTime time = LocalTime.of(12, 0);

        Shift shift = new Shift(restaurant, "Lunch", date.getDayOfWeek(),
                LocalTime.of(11, 0), LocalTime.of(15, 0), 50);
        shift.setStatus(ShiftStatus.ACTIVE);
        shiftRepository.save(shift);

        CreateHoldRequest holdRequest = new CreateHoldRequest(
                restaurant.getSlug(),
                date,
                time,
                2
        );

        MvcResult holdResult = mockMvc.perform(post("/api/holds")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(holdRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.holdToken").isNotEmpty())
                .andReturn();

        JsonNode holdJson = objectMapper.readTree(holdResult.getResponse().getContentAsString());
        String holdToken = holdJson.path("data").path("holdToken").asText();

        ConfirmHoldRequest confirmRequest = new ConfirmHoldRequest(
                "Guest",
                "guest@example.com",
                "123456",
                "Window seat"
        );

        MvcResult confirmResult = mockMvc.perform(post("/api/holds/{token}/confirm", holdToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.confirmationCode").isNotEmpty())
                .andExpect(jsonPath("$.data.cancelToken").isNotEmpty())
                .andReturn();

        JsonNode confirmJson = objectMapper.readTree(confirmResult.getResponse().getContentAsString());
        String confirmationCode = confirmJson.path("data").path("confirmationCode").asText();
        String cancelToken = confirmJson.path("data").path("cancelToken").asText();

        mockMvc.perform(get("/api/reservations/{code}", confirmationCode)
                        .param("cancelToken", cancelToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.confirmationCode").value(confirmationCode))
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));

        mockMvc.perform(post("/api/reservations/{code}/cancel", confirmationCode)
                        .param("cancelToken", cancelToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
    }
}
