package com.mesaro.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.auth.AuthRestaurantSummary;
import com.mesaro.security.AuthPrincipal;
import com.mesaro.security.RestaurantRole;
import com.mesaro.security.RestaurantRoleAssignment;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RateLimitFilterTest {

    @Mock
    private RateLimiter rateLimiter;

    @Mock
    private FilterChain filterChain;

    private RateLimitProperties properties;
    private RateLimitFilter rateLimitFilter;

    @BeforeEach
    void setUp() {
        properties = new RateLimitProperties();
        properties.setEnabled(true);
        properties.setTrustForwardedHeaders(true);
        properties.setTrustedProxies(List.of("10.0.0.0/8", "127.0.0.1"));

        rateLimitFilter = new RateLimitFilter(rateLimiter, properties, new ObjectMapper());
        when(rateLimiter.checkLimit(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(new RateLimiter.RateLimitResult(true, 10, 100, 0));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void spoofedXffFromUntrustedRemote_isIgnored() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/holds");
        request.setRemoteAddr("203.0.113.5");
        request.addHeader("X-Forwarded-For", "198.51.100.20");
        MockHttpServletResponse response = new MockHttpServletResponse();

        rateLimitFilter.doFilter(request, response, filterChain);

        verify(rateLimiter).checkLimit(eq("ip:203.0.113.5"), eq("holds"));
    }

    @Test
    void lanClientBehindDockerBridge_keepsItsOwnLimit() throws Exception {
        properties.setTrustedProxies(List.of("172.16.0.0/12"));
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/holds");
        request.setRemoteAddr("172.28.10.5");
        request.addHeader("X-Forwarded-For", "192.168.1.40");
        MockHttpServletResponse response = new MockHttpServletResponse();

        rateLimitFilter.doFilter(request, response, filterChain);

        verify(rateLimiter).checkLimit(eq("ip:192.168.1.40"), eq("holds"));
    }

    @Test
    void trustedProxyChain_usesOriginalClientIp() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/holds");
        request.setRemoteAddr("10.0.0.10");
        request.addHeader("X-Forwarded-For", "198.51.100.20, 10.0.0.9");
        MockHttpServletResponse response = new MockHttpServletResponse();

        rateLimitFilter.doFilter(request, response, filterChain);

        verify(rateLimiter).checkLimit(eq("ip:198.51.100.20"), eq("holds"));
    }

    @Test
    void forwardedChainWithOnlyTrustedHops_fallsBackToRemoteAddr() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/holds");
        request.setRemoteAddr("10.0.0.10");
        request.addHeader("X-Forwarded-For", "10.0.0.8,10.0.0.9");
        MockHttpServletResponse response = new MockHttpServletResponse();

        rateLimitFilter.doFilter(request, response, filterChain);

        verify(rateLimiter).checkLimit(eq("ip:10.0.0.10"), eq("holds"));
    }

    @Test
    void authenticatedPrincipal_overridesIpResolution() throws Exception {
        AuthPrincipal principal = new AuthPrincipal(
                42L,
                "staff@example.com",
                List.of(new AuthRestaurantSummary(1L, RestaurantRole.MANAGER)),
                List.of(new RestaurantRoleAssignment(1L, RestaurantRole.MANAGER))
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, "token", List.of())
        );

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/holds");
        request.setRemoteAddr("203.0.113.5");
        request.addHeader("X-Forwarded-For", "198.51.100.20");
        MockHttpServletResponse response = new MockHttpServletResponse();

        rateLimitFilter.doFilter(request, response, filterChain);

        verify(rateLimiter).checkLimit(eq("user:42"), eq("holds"));
    }
}
