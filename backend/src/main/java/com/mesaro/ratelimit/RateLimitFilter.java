package com.mesaro.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.common.ApiResponse;
import com.mesaro.common.ErrorCode;
import com.mesaro.security.AuthPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.math.BigInteger;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;
import java.io.IOException;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Rate limiting filter for API endpoints.
 *
 * Applies rate limits based on:
 * - Client identifier: authenticated user ID or IP address
 * - Endpoint group: derived from request path
 *
 * Returns 429 Too Many Requests with RATE_LIMITED error code when exceeded.
 *
 * Filter order: Should run AFTER authentication filter so we can use user ID when available.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Map<Pattern, String> ENDPOINT_PATTERNS = Map.of(
            Pattern.compile("^/api/availability.*"), "availability",
            Pattern.compile("^/api/holds.*"), "holds",
            Pattern.compile("^/api/reservations.*"), "reservations",
            Pattern.compile("^/api/auth.*"), "auth",
            Pattern.compile("^/api/admin.*"), "admin",
            Pattern.compile("^/api/contact.*"), "contact"
    );

    private static final String DEFAULT_GROUP = "default";
    private static final String HEADER_RATE_LIMIT_LIMIT = "X-RateLimit-Limit";
    private static final String HEADER_RATE_LIMIT_REMAINING = "X-RateLimit-Remaining";
    private static final String HEADER_RETRY_AFTER = "Retry-After";
    private static final Pattern IPV4_PATTERN = Pattern.compile("^(\\d{1,3}\\.){3}\\d{1,3}$");
    private static final Pattern IPV6_PATTERN = Pattern.compile("^[0-9A-Fa-f:.%]+$");

    private final RateLimiter rateLimiter;
    private final RateLimitProperties properties;
    private final ObjectMapper objectMapper;

    public RateLimitFilter(RateLimiter rateLimiter, RateLimitProperties properties, ObjectMapper objectMapper) {
        this.rateLimiter = rateLimiter;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // Skip if rate limiting is disabled
        if (!properties.isEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        // Skip non-API paths (swagger, actuator, etc.)
        String path = request.getRequestURI();
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientKey = resolveClientKey(request);
        String endpointGroup = resolveEndpointGroup(path);

        RateLimiter.RateLimitResult result = rateLimiter.checkLimit(clientKey, endpointGroup);

        // Add rate limit headers to response
        if (result.limitMax() > 0) {
            response.setHeader(HEADER_RATE_LIMIT_LIMIT, String.valueOf(result.limitMax()));
            response.setHeader(HEADER_RATE_LIMIT_REMAINING, String.valueOf(result.remainingTokens()));
        }

        if (result.allowed()) {
            filterChain.doFilter(request, response);
        } else {
            writeRateLimitExceeded(response, result.retryAfterSeconds());
        }
    }

    /**
     * Resolve client key for rate limiting.
     * Uses authenticated user ID if available, otherwise falls back to IP address.
     */
    private String resolveClientKey(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.isAuthenticated() &&
                authentication.getPrincipal() instanceof AuthPrincipal principal) {
            return "user:" + principal.getUserId();
        }

        // Fall back to IP address
        String ip = getClientIp(request);
        return "ip:" + ip;
    }

    /**
     * Extract client IP address, handling proxies.
     */
    private String getClientIp(HttpServletRequest request) {
        String remoteAddr = normalizeIp(request.getRemoteAddr());
        if (remoteAddr == null) {
            remoteAddr = request.getRemoteAddr();
        }

        if (!properties.isTrustForwardedHeaders() || !isTrustedProxy(remoteAddr)) {
            return remoteAddr;
        }

        String xForwardedFor = request.getHeader("X-Forwarded-For");
        String forwardedClientIp = extractClientFromForwardedChain(xForwardedFor, remoteAddr);
        if (forwardedClientIp != null) {
            return forwardedClientIp;
        }

        String xRealIp = request.getHeader("X-Real-IP");
        String normalizedRealIp = normalizeIp(xRealIp);
        if (normalizedRealIp != null) {
            return normalizedRealIp;
        }

        return remoteAddr;
    }

    private String extractClientFromForwardedChain(String xForwardedFor, String remoteAddr) {
        if (xForwardedFor == null || xForwardedFor.isBlank()) {
            return null;
        }

        List<String> chain = new ArrayList<>();
        for (String raw : xForwardedFor.split(",")) {
            String ip = normalizeIp(raw);
            if (ip != null) {
                chain.add(ip);
            }
        }

        if (chain.isEmpty()) {
            return null;
        }

        chain.add(remoteAddr);

        int index = chain.size() - 1;
        while (index >= 0 && isTrustedProxy(chain.get(index))) {
            index--;
        }

        if (index < 0) {
            // Forwarded chain only contained trusted proxies; treat as untrusted signal.
            return null;
        }

        return chain.get(index);
    }

    private boolean isTrustedProxy(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }

        for (String trustedProxy : properties.getTrustedProxies()) {
            if (trustedProxy == null || trustedProxy.isBlank()) {
                continue;
            }
            String entry = trustedProxy.trim();
            if (entry.contains("/")) {
                if (isIpInCidr(ip, entry)) {
                    return true;
                }
            } else {
                String trustedIp = normalizeIp(entry);
                if (trustedIp != null && trustedIp.equals(ip)) {
                    return true;
                }
            }
        }

        return false;
    }

    private String normalizeIp(String value) {
        if (value == null) {
            return null;
        }

        String candidate = value.trim();
        if (candidate.isEmpty()) {
            return null;
        }

        if (candidate.startsWith("for=")) {
            candidate = candidate.substring(4).trim();
        }
        if (candidate.startsWith("\"") && candidate.endsWith("\"") && candidate.length() > 1) {
            candidate = candidate.substring(1, candidate.length() - 1);
        }
        if (candidate.startsWith("[") && candidate.contains("]")) {
            candidate = candidate.substring(1, candidate.indexOf(']'));
        } else if (candidate.chars().filter(ch -> ch == ':').count() == 1 && candidate.contains(".")) {
            // Likely IPv4 with port.
            candidate = candidate.substring(0, candidate.indexOf(':'));
        }

        return isIpLiteral(candidate) ? candidate : null;
    }

    private boolean isIpLiteral(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        if (!looksLikeIpLiteral(value)) {
            return false;
        }
        try {
            InetAddress.getByName(value);
            return true;
        } catch (UnknownHostException e) {
            return false;
        }
    }

    private boolean looksLikeIpLiteral(String value) {
        if (value.contains(":")) {
            return IPV6_PATTERN.matcher(value).matches();
        }
        if (!IPV4_PATTERN.matcher(value).matches()) {
            return false;
        }
        String[] octets = value.split("\\.");
        for (String octet : octets) {
            int n = Integer.parseInt(octet);
            if (n < 0 || n > 255) {
                return false;
            }
        }
        return true;
    }

    private boolean isIpInCidr(String ip, String cidr) {
        try {
            String[] parts = cidr.split("/");
            if (parts.length != 2) {
                return false;
            }

            InetAddress ipAddress = InetAddress.getByName(ip);
            InetAddress network = InetAddress.getByName(parts[0]);
            int prefix = Integer.parseInt(parts[1]);

            byte[] ipBytes = ipAddress.getAddress();
            byte[] networkBytes = network.getAddress();

            if (ipBytes.length != networkBytes.length) {
                return false;
            }

            int maxPrefix = ipBytes.length * 8;
            if (prefix < 0 || prefix > maxPrefix) {
                return false;
            }

            BigInteger ipInt = new BigInteger(1, ipBytes);
            BigInteger networkInt = new BigInteger(1, networkBytes);
            int hostBits = maxPrefix - prefix;
            BigInteger mask = hostBits == 0
                    ? BigInteger.ONE.shiftLeft(maxPrefix).subtract(BigInteger.ONE)
                    : BigInteger.ONE.shiftLeft(maxPrefix).subtract(BigInteger.ONE).shiftRight(hostBits).shiftLeft(hostBits);

            return ipInt.and(mask).equals(networkInt.and(mask));
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Determine which endpoint group this request belongs to.
     */
    private String resolveEndpointGroup(String path) {
        for (Map.Entry<Pattern, String> entry : ENDPOINT_PATTERNS.entrySet()) {
            if (entry.getKey().matcher(path).matches()) {
                return entry.getValue();
            }
        }
        return DEFAULT_GROUP;
    }

    private void writeRateLimitExceeded(HttpServletResponse response, int retryAfterSeconds) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader(HEADER_RETRY_AFTER, String.valueOf(retryAfterSeconds));

        ApiResponse<?> errorResponse = ApiResponse.error(
                ErrorCode.RATE_LIMITED,
                "Rate limit exceeded. Please try again later."
        );
        objectMapper.writeValue(response.getWriter(), errorResponse);
    }
}
