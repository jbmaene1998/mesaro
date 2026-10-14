package com.mesaro.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.hold.CreateHoldRequest;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DstBookingIntegrationTest extends IntegrationTestBase {

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
    void createsReservationsAroundDstGapBoundary() throws Exception {
        ZoneId zone = ZoneId.of("America/New_York");
        LocalDate gapDate = findGapDate(zone);
        Restaurant restaurant = new Restaurant("DST Test", "dst-test-" + System.nanoTime(), zone.getId());
        restaurant.setBookingEnabled(true);
        restaurant.setMaxAdvanceDays(400);
        restaurant.setDefaultDurationMinutes(30);
        restaurant = restaurantRepository.save(restaurant);
        attachBillableOwner(restaurant);
        diningTableRepository.save(new DiningTable(restaurant, "T1", 4));
        diningTableRepository.save(new DiningTable(restaurant, "T2", 4));
        Shift shift = new Shift(restaurant, "Night", gapDate.getDayOfWeek(),
                LocalTime.of(0, 0), LocalTime.of(4, 0), 50);
        shift.setStatus(ShiftStatus.ACTIVE);
        shiftRepository.save(shift);

        int beforeStatus = mockMvc.perform(post("/api/holds")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateHoldRequest(
                                restaurant.getSlug(), gapDate, LocalTime.of(1, 59), 2
                        ))))
                .andReturn()
                .getResponse()
                .getStatus();
        int gapStatus = mockMvc.perform(post("/api/holds")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateHoldRequest(
                                restaurant.getSlug(), gapDate, LocalTime.of(2, 30), 2
                        ))))
                .andReturn()
                .getResponse()
                .getStatus();
        int afterStatus = mockMvc.perform(post("/api/holds")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateHoldRequest(
                                restaurant.getSlug(), gapDate, LocalTime.of(3, 1), 2
                        ))))
                .andReturn()
                .getResponse()
                .getStatus();

        assertThat(beforeStatus).isEqualTo(201);
        assertThat(gapStatus).isEqualTo(422);
        assertThat(afterStatus).isEqualTo(201);
    }

    private LocalDate findGapDate(ZoneId zone) {
        LocalDate start = LocalDate.now(zone);
        for (int i = 0; i < 730; i++) {
            LocalDate d = start.plusDays(i);
            if (zone.getRules().getValidOffsets(LocalDateTime.of(d, LocalTime.of(2, 30))).isEmpty()) {
                return d;
            }
        }
        throw new IllegalStateException("No DST gap date found");
    }
}
