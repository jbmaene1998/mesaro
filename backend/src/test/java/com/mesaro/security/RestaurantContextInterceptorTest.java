package com.mesaro.security;

import com.mesaro.auth.AuthRestaurantSummary;
import com.mesaro.billing.BillingService;
import com.mesaro.restaurant.RestaurantRepository;
import com.mesaro.user.UserRestaurantRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerMapping;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RestaurantContextInterceptorTest {

    @Mock
    private UserRestaurantRepository userRestaurantRepository;
    @Mock
    private RestaurantRepository restaurantRepository;
    @Mock
    private BillingService billingService;

    private RestaurantContextInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new RestaurantContextInterceptor(userRestaurantRepository, restaurantRepository, billingService);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        RestaurantContextHolder.clear();
    }

    @Test
    void preHandle_deniesCrossRestaurantAccessOnRestaurantPath() {
        AuthPrincipal principal = principalWith(
                List.of(new RestaurantRoleAssignment(1L, RestaurantRole.STAFF))
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, "token", List.of())
        );
        when(userRestaurantRepository.findEffectiveRole(7L, 2L)).thenReturn(Optional.empty());

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/restaurants/2/shifts");
        request.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE, Map.of("id", "2"));

        assertThatThrownBy(() -> interceptor.preHandle(request, new MockHttpServletResponse(), new Object()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void preHandle_ignoresNonRestaurantIdVariablesForContextResolution() {
        AuthPrincipal principal = principalWith(
                List.of(new RestaurantRoleAssignment(1L, RestaurantRole.MANAGER))
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, "token", List.of())
        );

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/staff/999");
        request.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE, Map.of("id", "999"));

        boolean handled = interceptor.preHandle(request, new MockHttpServletResponse(), new Object());
        assertThat(handled).isTrue();

        assertThat(RestaurantContextHolder.get()).isEmpty();
    }

    @Test
    void preHandle_ignoresRestaurantHeaderForAnonymousAuthentication() {
        SecurityContextHolder.getContext().setAuthentication(
                new AnonymousAuthenticationToken(
                        "anonymous-key",
                        "anonymousUser",
                        AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")
                )
        );

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.addHeader(RestaurantContextInterceptor.RESTAURANT_HEADER, "1");

        boolean handled = interceptor.preHandle(request, new MockHttpServletResponse(), new Object());

        assertThat(handled).isTrue();
        assertThat(RestaurantContextHolder.get()).isEmpty();
        verifyNoInteractions(userRestaurantRepository);
    }

    private AuthPrincipal principalWith(List<RestaurantRoleAssignment> roles) {
        List<AuthRestaurantSummary> summaries = roles.stream()
                .map(role -> new AuthRestaurantSummary(role.restaurantId(), role.role()))
                .toList();
        return new AuthPrincipal(7L, "user@example.com", summaries, roles);
    }
}
