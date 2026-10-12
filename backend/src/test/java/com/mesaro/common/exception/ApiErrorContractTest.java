package com.mesaro.common.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.auth.AuthController;
import com.mesaro.auth.AuthService;
import com.mesaro.reservation.ReservationController;
import com.mesaro.reservation.ReservationService;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantController;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.security.RestaurantAccessGuard;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.vacation.Vacation;
import com.mesaro.vacation.VacationController;
import com.mesaro.vacation.VacationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ApiErrorContractTest {

    @Mock
    private AuthService authService;
    @Mock
    private RestaurantService restaurantService;
    @Mock
    private VacationService vacationService;
    @Mock
    private RestaurantAccessGuard restaurantAccessGuard;
    @Mock
    private UserAccountRepository userAccountRepository;
    @Mock
    private ReservationService reservationService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

        mockMvc = MockMvcBuilders.standaloneSetup(
                        new AuthController(authService),
                        new RestaurantController(restaurantService),
                        new VacationController(vacationService, restaurantAccessGuard, userAccountRepository),
                        new ReservationController(reservationService, restaurantService)
                )
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .setValidator(validator)
                .build();
    }

    @Test
    void login_invalidEmail_returns400WithField() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"invalid\",\"password\":\"secret\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.field").value("email"));
    }

    @Test
    void currentUser_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/auth/current-user"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void restaurants_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/restaurants"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void vacation_accessDenied_returns403() throws Exception {
        Restaurant restaurant = new Restaurant("Demo", "demo", "UTC");
        Vacation vacation = Vacation.createClosure(
                restaurant,
                com.mesaro.vacation.ClosureReason.HOLIDAY,
                java.time.LocalDate.parse("2026-01-01"),
                java.time.LocalDate.parse("2026-01-02")
        );
        when(vacationService.findByIdWithRestaurant(10L)).thenReturn(vacation);
        when(restaurantAccessGuard.hasAtLeastRole(null, "STAFF")).thenReturn(false);

        mockMvc.perform(get("/api/vacations/10"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void reservationCancel_missingCancelToken_returns400WithField() throws Exception {
        mockMvc.perform(post("/api/reservations/ABC/cancel"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.field").value("cancelToken"));
    }

    @Test
    void reservationCancel_codeMismatch_returns404() throws Exception {
        when(reservationService.cancelByCodeAndToken(eq("ABC"), eq("token")))
                .thenThrow(new NotFoundException("Reservation not found"));

        mockMvc.perform(post("/api/reservations/ABC/cancel")
                        .queryParam("cancelToken", "token"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    void login_unexpectedException_returns500WithoutLeak() throws Exception {
        when(authService.login(org.mockito.ArgumentMatchers.any()))
                .thenThrow(new RuntimeException("database connection refused"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@example.com\",\"password\":\"secret\"}"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.error.message").value("An unexpected error occurred"));
    }
}
