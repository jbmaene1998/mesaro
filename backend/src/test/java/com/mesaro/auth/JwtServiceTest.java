package com.mesaro.auth;

import com.mesaro.security.AuthPrincipal;
import com.mesaro.security.RestaurantRole;
import com.mesaro.security.RestaurantRoleAssignment;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "test-secret-test-secret-test-secret-test-secret";

    @Test
    void tokenContainsRestaurantRolesClaim() {
        JwtService jwtService = new JwtService(SECRET, 15);
        List<AuthRestaurantSummary> restaurants = List.of(
                new AuthRestaurantSummary(10L, RestaurantRole.MANAGER),
                new AuthRestaurantSummary(20L, RestaurantRole.STAFF)
        );

        String token = jwtService.generateAccessToken(5L, "user@example.com", restaurants, 3);

        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();

        Number userId = claims.get("userId", Number.class);
        assertThat(userId).isNotNull();
        assertThat(userId.longValue()).isEqualTo(5L);
        assertThat(claims.get("email", String.class)).isEqualTo("user@example.com");

        Object restaurantsClaim = claims.get("restaurants");
        assertThat(restaurantsClaim).isInstanceOf(List.class);

        List<?> claimList = (List<?>) restaurantsClaim;
        assertThat(claimList).hasSize(2);

        Map<?, ?> first = (Map<?, ?>) claimList.get(0);
        assertThat(first.get("restaurantId")).isEqualTo(10);
        assertThat(first.get("role")).isEqualTo("MANAGER");
    }

    @Test
    void parseAccessTokenBuildsPrincipalWithRoles() {
        JwtService jwtService = new JwtService(SECRET, 15);
        List<AuthRestaurantSummary> restaurants = List.of(
                new AuthRestaurantSummary(42L, RestaurantRole.OWNER)
        );

        String token = jwtService.generateAccessToken(7L, "owner@example.com", restaurants, 3);

        AuthPrincipal principal = jwtService.parseAccessToken(token);

        assertThat(principal.getUserId()).isEqualTo(7L);
        assertThat(principal.getEmail()).isEqualTo("owner@example.com");
        assertThat(principal.getRestaurantRoles())
                .containsExactly(new RestaurantRoleAssignment(42L, RestaurantRole.OWNER));
    }

    @Test
    void parseAccessToken_missingUserIdClaim_throwsJwtException() {
        JwtService jwtService = new JwtService(SECRET, 15);
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

        String token = Jwts.builder()
                .claim("email", "owner@example.com")
                .signWith(key)
                .compact();

        assertThatThrownBy(() -> jwtService.parseAccessToken(token))
                .isInstanceOf(JwtException.class)
                .hasMessageContaining("userId");
    }
}
