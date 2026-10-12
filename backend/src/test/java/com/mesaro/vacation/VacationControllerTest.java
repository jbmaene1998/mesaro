package com.mesaro.vacation;

import com.mesaro.auth.AuthRestaurantSummary;
import com.mesaro.integration.IntegrationTestBase;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantRepository;
import com.mesaro.security.AuthPrincipal;
import com.mesaro.security.RestaurantRole;
import com.mesaro.security.RestaurantRoleAssignment;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserRestaurant;
import com.mesaro.user.UserRestaurantRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VacationControllerTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private RestaurantRepository restaurantRepository;
    @Autowired
    private UserAccountRepository userAccountRepository;
    @Autowired
    private UserRestaurantRepository userRestaurantRepository;
    @Autowired
    private VacationRepository vacationRepository;

    @Test
    void staffCannotUpdateVacation() throws Exception {
        Fixture fixture = createFixture();
        Authentication staffAuth = authFor(fixture.staff, fixture.restaurant.getId(), RestaurantRole.STAFF);

        mockMvc.perform(put("/api/vacations/{id}", fixture.vacation.getId())
                        .with(SecurityMockMvcRequestPostProcessors.authentication(staffAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"notes":"unauthorized update"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void staffCannotCancelVacation() throws Exception {
        Fixture fixture = createFixture();
        Authentication staffAuth = authFor(fixture.staff, fixture.restaurant.getId(), RestaurantRole.STAFF);

        mockMvc.perform(delete("/api/vacations/{id}", fixture.vacation.getId())
                        .with(SecurityMockMvcRequestPostProcessors.authentication(staffAuth)))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerCanUpdateVacation() throws Exception {
        Fixture fixture = createFixture();
        Authentication managerAuth = authFor(fixture.manager, fixture.restaurant.getId(), RestaurantRole.MANAGER);

        mockMvc.perform(put("/api/vacations/{id}", fixture.vacation.getId())
                        .with(SecurityMockMvcRequestPostProcessors.authentication(managerAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"notes":"authorized update"}
                                """))
                .andExpect(status().isOk());
    }

    private Fixture createFixture() {
        Restaurant restaurant = restaurantRepository.save(new Restaurant("Vacation Test", "vac-test-" + System.nanoTime(), "UTC"));
        UserAccount manager = userAccountRepository.save(new UserAccount("manager-vac@example.com", "hash"));
        UserAccount staff = userAccountRepository.save(new UserAccount("staff-vac@example.com", "hash"));
        userRestaurantRepository.save(new UserRestaurant(manager, restaurant, RestaurantRole.MANAGER));
        userRestaurantRepository.save(new UserRestaurant(staff, restaurant, RestaurantRole.STAFF));

        Vacation vacation = Vacation.createStaffVacation(
                restaurant,
                staff.getId(),
                VacationReason.PERSONAL,
                LocalDate.now().plusDays(2),
                LocalDate.now().plusDays(3)
        );
        vacation = vacationRepository.save(vacation);
        return new Fixture(restaurant, manager, staff, vacation);
    }

    private Authentication authFor(UserAccount user, Long restaurantId, RestaurantRole role) {
        AuthRestaurantSummary summary = new AuthRestaurantSummary(restaurantId, role);
        RestaurantRoleAssignment assignment = new RestaurantRoleAssignment(restaurantId, role);
        AuthPrincipal principal = new AuthPrincipal(user.getId(), user.getEmail(), List.of(summary), List.of(assignment));
        return new UsernamePasswordAuthenticationToken(principal, null, List.of());
    }

    private record Fixture(Restaurant restaurant, UserAccount manager, UserAccount staff, Vacation vacation) {
    }
}
