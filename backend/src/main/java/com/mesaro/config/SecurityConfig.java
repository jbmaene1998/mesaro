package com.mesaro.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.common.ApiResponse;
import com.mesaro.common.ErrorCode;
import com.mesaro.ratelimit.RateLimitFilter;
import com.mesaro.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = {
            "/api/health",
            // PathPattern: exact + /** — bare /api/availability must be listed separately from /**
            "/api/availability",
            "/api/availability/**",
            "/api/holds",
            "/api/holds/**",
            "/api/analytics/events",
            "/api/contact",
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/refresh",
            "/api/auth/logout",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/verify-email",
            "/api/auth/resend-verification",
            "/api/staff/accept-invite",
            "/api/staff/invites/preview",
            // Actuator health endpoints are safe to expose publicly.
            "/actuator/health",
            "/actuator/health/**",
            // Stripe webhook — authenticated via HMAC signature, not JWT
            "/api/webhooks/stripe",
            // Avoid masking controller failures as 401 when the container dispatches to /error
            "/error"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper objectMapper,
                                                   JwtAuthenticationFilter jwtAuthenticationFilter,
                                                   RateLimitFilter rateLimitFilter) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) -> {
                            writeError(response, objectMapper, HttpStatus.UNAUTHORIZED,
                                    ErrorCode.UNAUTHORIZED, "Authentication required");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            writeError(response, objectMapper, HttpStatus.FORBIDDEN,
                                    ErrorCode.FORBIDDEN, "Access denied");
                        })
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/reservations/*").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/reservations/*/cancel").permitAll()
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(rateLimitFilter, JwtAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    private void writeError(HttpServletResponse response, ObjectMapper objectMapper, HttpStatus status,
                            String code, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), ApiResponse.error(code, message));
    }
}
