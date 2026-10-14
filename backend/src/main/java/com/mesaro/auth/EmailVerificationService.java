package com.mesaro.auth;

import com.mesaro.common.exception.ValidationException;
import com.mesaro.infra.EmailService;
import com.mesaro.infra.TimeService;
import com.mesaro.infra.TokenService;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;

@Service
public class EmailVerificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);

    private final UserAccountRepository userAccountRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final TokenService tokenService;
    private final TimeService timeService;
    private final EmailService emailService;
    private final long verificationTtlHours;

    public EmailVerificationService(UserAccountRepository userAccountRepository,
                                    EmailVerificationTokenRepository emailVerificationTokenRepository,
                                    TokenService tokenService,
                                    TimeService timeService,
                                    EmailService emailService,
                                    @Value("${app.security.email-verification-ttl-hours:48}") long verificationTtlHours) {
        this.userAccountRepository = userAccountRepository;
        this.emailVerificationTokenRepository = emailVerificationTokenRepository;
        this.tokenService = tokenService;
        this.timeService = timeService;
        this.emailService = emailService;
        this.verificationTtlHours = verificationTtlHours;
    }

    @Transactional
    public void sendVerification(UserAccount user) {
        if (user == null || user.isEmailVerified()) {
            return;
        }

        Instant now = timeService.now();
        emailVerificationTokenRepository.findActiveByUserIdForUpdate(user.getId(), now)
                .ifPresent(existing -> {
                    existing.markUsed(now);
                    emailVerificationTokenRepository.save(existing);
                });

        String rawToken = tokenService.generateToken();
        String tokenHash = tokenService.hashToken(rawToken);
        Instant expiresAt = now.plusSeconds(verificationTtlHours * 3600L);
        emailVerificationTokenRepository.save(new EmailVerificationToken(user, tokenHash, expiresAt));

        try {
            emailService.sendEmailVerification(user.getEmail(), user.getFullName(), rawToken);
        } catch (RuntimeException ex) {
            log.warn("Failed to send verification email for user {}", user.getId());
        }
    }

    @Transactional
    public UserAccount verify(String token) {
        if (token == null || token.isBlank()) {
            throw new ValidationException("Invalid or expired verification link", "token");
        }

        String rawToken = token.trim();
        String tokenHash = tokenService.hashToken(rawToken);
        EmailVerificationToken verificationToken = emailVerificationTokenRepository.findByTokenHashForUpdate(tokenHash)
                .orElseThrow(() -> new ValidationException("Invalid or expired verification link", "token"));

        Instant now = timeService.now();
        if (verificationToken.getUsedAtUtc() != null || verificationToken.getExpiresAtUtc().isBefore(now)) {
            throw new ValidationException("Invalid or expired verification link", "token");
        }
        if (!tokenService.verifyToken(rawToken, verificationToken.getTokenHash())) {
            throw new ValidationException("Invalid or expired verification link", "token");
        }

        verificationToken.markUsed(now);
        emailVerificationTokenRepository.save(verificationToken);

        UserAccount user = verificationToken.getUser();
        user.markEmailVerified(now);
        return userAccountRepository.save(user);
    }

    @Transactional
    public void resend(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        userAccountRepository.findByEmailIgnoreCase(normalizedEmail)
                .ifPresent(this::sendVerification);
    }
}
