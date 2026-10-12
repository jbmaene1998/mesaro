package com.mesaro.auth;

import com.mesaro.security.AuthPrincipal;
import com.mesaro.security.RestaurantRole;
import com.mesaro.security.RestaurantRoleAssignment;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import com.mesaro.infra.LogSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private final SecretKey secretKey;
    private final long accessTokenTtlMinutes;

    public JwtService(
            @Value("${app.security.jwt.secret}") String secret,
            @Value("${app.security.jwt.access-token-ttl-minutes}") long accessTokenTtlMinutes) {
        this.secretKey = buildKey(secret);
        this.accessTokenTtlMinutes = accessTokenTtlMinutes;
    }

    public String generateAccessToken(Long userId, String email, List<AuthRestaurantSummary> restaurants,
                                      int maxRestaurants) {
        Instant now = Instant.now();
        Instant expiry = now.plus(accessTokenTtlMinutes, ChronoUnit.MINUTES);

        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("email", email);
        claims.put("restaurants", toClaimRestaurants(restaurants));
        claims.put("maxRestaurants", maxRestaurants);

        return Jwts.builder()
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiry))
                .addClaims(claims)
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public AuthPrincipal parseAccessToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(secretKey)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            Long userId = parseUserId(claims.get("userId"));
            String email = claims.get("email", String.class);
            List<AuthRestaurantSummary> restaurants = parseRestaurants(claims.get("restaurants"));
            List<RestaurantRoleAssignment> assignments = toAssignments(restaurants);

            return new AuthPrincipal(userId, email, restaurants, assignments);
        } catch (JwtException ex) {
            log.debug("Invalid JWT token: {}", LogSanitizer.exceptionType(ex));
            throw ex;
        }
    }

    public long getAccessTokenTtlSeconds() {
        return accessTokenTtlMinutes * 60;
    }

    private SecretKey buildKey(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT secret is not configured");
        }

        byte[] keyBytes;
        if (isBase64(secret)) {
            keyBytes = Decoders.BASE64.decode(secret);
        } else {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }

        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 bytes");
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }

    private boolean isBase64(String value) {
        return value.matches("^[A-Za-z0-9+/=]+$");
    }

    private Long parseUserId(Object value) {
        if (value == null) {
            throw new JwtException("Missing userId claim");
        }
        Long parsed = toLong(value);
        if (parsed == null) {
            throw new JwtException("Invalid userId claim");
        }
        return parsed;
    }

    private List<Map<String, Object>> toClaimRestaurants(List<AuthRestaurantSummary> restaurants) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (restaurants == null) {
            return result;
        }
        for (AuthRestaurantSummary summary : restaurants) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("restaurantId", summary.restaurantId());
            entry.put("role", summary.role() != null ? summary.role().name() : null);
            result.add(entry);
        }
        return result;
    }

    private List<AuthRestaurantSummary> parseRestaurants(Object claim) {
        if (!(claim instanceof List<?> list)) {
            return List.of();
        }

        List<AuthRestaurantSummary> result = new ArrayList<>();
        for (Object entry : list) {
            if (!(entry instanceof Map<?, ?> map)) {
                continue;
            }
            Long id = toLong(map.get("restaurantId"));
            RestaurantRole role = RestaurantRole.fromString(valueAsString(map.get("role")));
            if (id != null && role != null) {
                result.add(new AuthRestaurantSummary(id, role));
            }
        }
        return result;
    }

    private List<RestaurantRoleAssignment> toAssignments(List<AuthRestaurantSummary> restaurants) {
        List<RestaurantRoleAssignment> assignments = new ArrayList<>();
        for (AuthRestaurantSummary summary : restaurants) {
            assignments.add(new RestaurantRoleAssignment(summary.restaurantId(), summary.role()));
        }
        return assignments;
    }

    private Long toLong(Object value) {
        if (value instanceof Long longValue) {
            return longValue;
        }
        if (value instanceof Integer intValue) {
            return intValue.longValue();
        }
        if (value instanceof String stringValue) {
            try {
                return Long.parseLong(stringValue);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private String valueAsString(Object value) {
        return value != null ? value.toString() : null;
    }
}
