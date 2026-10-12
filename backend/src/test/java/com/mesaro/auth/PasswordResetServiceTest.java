package com.mesaro.auth;

import com.mesaro.infra.EmailService;
import com.mesaro.infra.TimeService;
import com.mesaro.infra.TokenService;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private TokenService tokenService;
    @Mock
    private TimeService timeService;
    @Mock
    private EmailService emailService;
    @Mock
    private PasswordEncoder passwordEncoder;

    private PasswordResetService passwordResetService;

    @BeforeEach
    void setUp() {
        passwordResetService = new PasswordResetService(
                userAccountRepository,
                passwordResetTokenRepository,
                refreshTokenRepository,
                tokenService,
                timeService,
                emailService,
                passwordEncoder,
                2
        );
    }

    @Test
    void resetPassword_revokesAllRefreshTokensForUser() {
        UserAccount user = new UserAccount("user@example.com", "old-hash");
        ReflectionTestUtils.setField(user, "id", 77L);
        PasswordResetToken resetToken = new PasswordResetToken(
                user,
                "token-hash",
                Instant.parse("2026-01-01T02:00:00Z")
        );

        when(tokenService.hashToken("raw-token")).thenReturn("token-hash");
        when(passwordResetTokenRepository.findByTokenHashForUpdate("token-hash")).thenReturn(Optional.of(resetToken));
        when(tokenService.verifyToken("raw-token", "token-hash")).thenReturn(true);
        when(timeService.now()).thenReturn(Instant.parse("2026-01-01T01:00:00Z"));
        when(passwordEncoder.encode("new-password")).thenReturn("encoded-password");

        passwordResetService.resetPassword("raw-token", "new-password");

        verify(refreshTokenRepository).revokeAllForUser(77L);
        verify(userAccountRepository).save(user);
        verify(passwordResetTokenRepository).save(resetToken);
        verify(passwordEncoder).encode("new-password");
    }
}
