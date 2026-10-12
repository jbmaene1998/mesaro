package com.mesaro.security;

import com.mesaro.auth.AuthRestaurantSummary;
import com.mesaro.user.UserRestaurantRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RestaurantAccessGuardTest {

    @Mock
    private UserRestaurantRepository userRestaurantRepository;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void hasAtLeastRole_usesDatabaseRoleAndAllowsWhenSufficient() {
        RestaurantAccessGuard guard = new RestaurantAccessGuard(userRestaurantRepository);
        AuthPrincipal principal = principalWith(77L, 10L, RestaurantRole.MANAGER);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, "token", List.of())
        );
        when(userRestaurantRepository.findEffectiveRole(77L, 10L)).thenReturn(Optional.of(RestaurantRole.MANAGER));

        assertThat(guard.hasAtLeastRole(10L, "STAFF")).isTrue();
    }

    @Test
    void hasAtLeastRole_deniesWhenMembershipMissingEvenIfJwtContainsRole() {
        RestaurantAccessGuard guard = new RestaurantAccessGuard(userRestaurantRepository);
        AuthPrincipal principal = principalWith(77L, 10L, RestaurantRole.OWNER);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, "token", List.of())
        );
        when(userRestaurantRepository.findEffectiveRole(77L, 10L)).thenReturn(Optional.empty());

        assertThat(guard.hasAtLeastRole(10L, "STAFF")).isFalse();
    }

    private AuthPrincipal principalWith(Long userId, Long restaurantId, RestaurantRole role) {
        AuthRestaurantSummary summary = new AuthRestaurantSummary(restaurantId, role);
        RestaurantRoleAssignment assignment = new RestaurantRoleAssignment(restaurantId, role);
        return new AuthPrincipal(userId, "user@example.com", List.of(summary), List.of(assignment));
    }
}
