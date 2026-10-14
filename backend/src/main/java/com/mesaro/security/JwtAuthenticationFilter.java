package com.mesaro.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.auth.JwtService;
import com.mesaro.common.ApiResponse;
import com.mesaro.common.ErrorCode;
import com.mesaro.user.UserAccountRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final ObjectMapper objectMapper;
    private final TokenDenylistService tokenDenylistService;
    private final UserAccountRepository userAccountRepository;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   ObjectMapper objectMapper,
                                   TokenDenylistService tokenDenylistService,
                                   UserAccountRepository userAccountRepository) {
        this.jwtService = jwtService;
        this.objectMapper = objectMapper;
        this.tokenDenylistService = tokenDenylistService;
        this.userAccountRepository = userAccountRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);
        try {
            AuthPrincipal principal = jwtService.parseAccessToken(token);
            if (principal.getUserId() != null && tokenDenylistService.isDenied(principal.getUserId())) {
                SecurityContextHolder.clearContext();
                writeUnauthorized(response);
                return;
            }
            if (principal.getUserId() != null
                    && userAccountRepository.findById(principal.getUserId())
                    .filter(account -> !account.isEmailVerified())
                    .isPresent()) {
                SecurityContextHolder.clearContext();
                writeEmailUnverified(response);
                return;
            }
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(principal, token, List.of());
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (RuntimeException ex) {
            SecurityContextHolder.clearContext();
            writeUnauthorized(response);
        }
    }

    private void writeUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), ApiResponse.error(ErrorCode.UNAUTHORIZED, "Invalid token"));
    }

    private void writeEmailUnverified(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(),
                ApiResponse.error(ErrorCode.EMAIL_NOT_VERIFIED, "Verify your email before continuing"));
    }
}
