package com.mesaro.auth;

import com.mesaro.common.exception.ValidationException;
import com.mesaro.infra.EmailService;
import com.mesaro.infra.TimeService;
import com.mesaro.infra.TokenService;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@Transactional(readOnly = true)
public class PasswordResetService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TokenService tokenService;
    private final TimeService timeService;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final long resetTtlHours;

    public PasswordResetService(UserAccountRepository userAccountRepository,
                                PasswordResetTokenRepository passwordResetTokenRepository,
                                RefreshTokenRepository refreshTokenRepository,
                                TokenService tokenService,
                                TimeService timeService,
                                EmailService emailService,
                                PasswordEncoder passwordEncoder,
                                @Value("${app.staff.reset-ttl-hours:2}") long resetTtlHours) {
        this.userAccountRepository = userAccountRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.tokenService = tokenService;
        this.timeService = timeService;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.resetTtlHours = resetTtlHours;
    }

    @Transactional
    public void requestReset(String email) {
        String normalizedEmail = normalizeEmail(email);

        userAccountRepository.findByEmailIgnoreCase(normalizedEmail)
                .ifPresent(user -> {
                    Instant now = timeService.now();
                    passwordResetTokenRepository.findActiveByUserIdForUpdate(user.getId(), now)
                            .ifPresent(existing -> {
                                existing.markUsed(now);
                                passwordResetTokenRepository.save(existing);
                            });

                    String rawToken = tokenService.generateToken();
                    String tokenHash = tokenService.hashToken(rawToken);
                    Instant expiresAt = now.plusSeconds(resetTtlHours * 3600L);

                    PasswordResetToken resetToken = new PasswordResetToken(user, tokenHash, expiresAt);
                    passwordResetTokenRepository.save(resetToken);
                    emailService.sendPasswordReset(user.getEmail(), rawToken);
                });
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        String rawToken = validateToken(token);
        String newPasswordValue = validateNewPassword(newPassword);

        String tokenHash = tokenService.hashToken(rawToken);
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHashForUpdate(tokenHash)
                .orElseThrow(() -> new ValidationException("Invalid or expired reset token", "token"));

        if (!tokenService.verifyToken(rawToken, resetToken.getTokenHash())) {
            throw new ValidationException("Invalid or expired reset token", "token");
        }

        Instant now = timeService.now();
        if (resetToken.getUsedAtUtc() != null || resetToken.getExpiresAtUtc().isBefore(now)) {
            throw new ValidationException("Invalid or expired reset token", "token");
        }

        UserAccount user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPasswordValue));
        userAccountRepository.save(user);

        // Invalidate all active refresh sessions after password reset.
        refreshTokenRepository.revokeAllForUser(user.getId());

        resetToken.markUsed(now);
        passwordResetTokenRepository.save(resetToken);
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ValidationException("Email is required", "email");
        }
        return email.trim().toLowerCase();
    }

    private String validateToken(String token) {
        if (token == null || token.isBlank()) {
            throw new ValidationException("Reset token is required", "token");
        }
        return token.trim();
    }

    private String validateNewPassword(String newPassword) {
        if (newPassword == null || newPassword.isBlank()) {
            throw new ValidationException("New password is required", "newPassword");
        }
        if (newPassword.length() < 8 || newPassword.length() > 72) {
            throw new ValidationException("Password must be between 8 and 72 characters", "newPassword");
        }
        return newPassword;
    }
}
