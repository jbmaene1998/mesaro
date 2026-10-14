package com.mesaro.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.auth.LoginRequest;
import com.mesaro.auth.LogoutRequest;
import com.mesaro.auth.PasswordResetToken;
import com.mesaro.auth.PasswordResetTokenRepository;
import com.mesaro.auth.RefreshRequest;
import com.mesaro.auth.RegisterRequest;
import com.mesaro.auth.ResetPasswordRequest;
import com.mesaro.infra.TokenService;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthFlowIntegrationTest extends IntegrationTestBase {
    private static final String TEST_IP = "198.51.100.42";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.security.jwt.secret}")
    private String jwtSecret;

    @Test
    void authFlow_login_refresh_logout() throws Exception {
        UserAccount user = new UserAccount("user@example.com", passwordEncoder.encode("secret"));
        userAccountRepository.save(user);

        LoginRequest loginRequest = new LoginRequest("user@example.com", "secret");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .with(request -> {
                            request.setRemoteAddr(TEST_IP);
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andReturn();

        JsonNode loginJson = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String refreshToken = loginJson.path("data").path("refreshToken").asText();

        RefreshRequest refreshRequest = new RefreshRequest(refreshToken);
        MvcResult refreshResult = mockMvc.perform(post("/api/auth/refresh")
                        .with(request -> {
                            request.setRemoteAddr(TEST_IP);
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andReturn();

        JsonNode refreshJson = objectMapper.readTree(refreshResult.getResponse().getContentAsString());
        String rotatedRefreshToken = refreshJson.path("data").path("refreshToken").asText();

        // old refresh token must be invalid after rotation
        mockMvc.perform(post("/api/auth/refresh")
                        .with(request -> {
                            request.setRemoteAddr(TEST_IP);
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isUnauthorized());

        LogoutRequest logoutRequest = new LogoutRequest(rotatedRefreshToken);
        mockMvc.perform(post("/api/auth/logout")
                        .with(request -> {
                            request.setRemoteAddr(TEST_IP);
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(logoutRequest)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/refresh")
                        .with(request -> {
                            request.setRemoteAddr(TEST_IP);
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshRequest(rotatedRefreshToken))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/logout")
                        .with(request -> {
                            request.setRemoteAddr(TEST_IP);
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(logoutRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void register_requiresEmailVerificationBeforeLogin() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "signup-owner@example.com",
                "secret123",
                null,
                null
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.verificationRequired").value(true))
                .andExpect(jsonPath("$.data.email").value("signup-owner@example.com"))
                .andExpect(jsonPath("$.data.accessToken").doesNotExist());

        UserAccount user = userAccountRepository.findByEmail("signup-owner@example.com").orElseThrow();
        assertThat(user.isEmailVerified()).isFalse();

        mockMvc.perform(post("/api/auth/login")
                        .with(requestPost -> {
                            requestPost.setRemoteAddr(TEST_IP);
                            return requestPost;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("signup-owner@example.com", "secret123"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("EMAIL_NOT_VERIFIED"));
    }

    @Test
    void register_duplicateEmail_returnsConflictWithField() throws Exception {
        RegisterRequest first = new RegisterRequest(
                "duplicate-owner@example.com",
                "secret123",
                null,
                null
        );

        RegisterRequest second = new RegisterRequest(
                "duplicate-owner@example.com",
                "secret123",
                null,
                null
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(first)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(second)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("CONFLICT"))
                .andExpect(jsonPath("$.error.field").value("email"));
    }

    @Test
    void passwordReset_revokesExistingRefreshSessions() throws Exception {
        UserAccount user = new UserAccount("reset-user@example.com", passwordEncoder.encode("secret"));
        userAccountRepository.save(user);

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("reset-user@example.com", "secret"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andReturn();

        JsonNode loginJson = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String oldRefreshToken = loginJson.path("data").path("refreshToken").asText();

        String rawResetToken = "reset-token-raw-123";
        String resetHash = tokenService.hashToken(rawResetToken);
        passwordResetTokenRepository.save(new PasswordResetToken(
                user,
                resetHash,
                Instant.now().plusSeconds(3600)
        ));

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new ResetPasswordRequest(rawResetToken, "new-secret"))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshRequest(oldRefreshToken))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void currentUser_withMissingUserIdClaim_returnsUnauthorized() throws Exception {
        String invalidToken = Jwts.builder()
                .claim("email", "missing-user-id@example.com")
                .setExpiration(java.util.Date.from(Instant.now().plus(5, ChronoUnit.MINUTES)))
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(
                        jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                .compact();

        mockMvc.perform(get("/api/auth/current-user")
                        .header("Authorization", "Bearer " + invalidToken))
                .andExpect(status().isUnauthorized());
    }
}
