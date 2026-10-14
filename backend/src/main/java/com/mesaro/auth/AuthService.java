package com.mesaro.auth;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.billing.BillingService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.EmailNotVerifiedException;
import com.mesaro.common.exception.NotFoundException;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.infra.TokenService;
import com.mesaro.infra.EmailService;
import com.mesaro.planning.StaffShiftAssignmentRepository;
import com.mesaro.planning.StaffWeeklyWorkHoursRepository;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.security.RestaurantRole;
import com.mesaro.security.TokenDenylistService;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserAccountStatus;
import com.mesaro.user.UserRestaurant;
import com.mesaro.user.UserRestaurantRepository;
import com.mesaro.vacation.VacationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String ACCOUNT_DELETE_CONFIRM_PHRASE = "DELETE";

    private final UserAccountRepository userAccountRepository;
    private final UserRestaurantRepository userRestaurantRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final StaffShiftAssignmentRepository staffShiftAssignmentRepository;
    private final StaffWeeklyWorkHoursRepository staffWeeklyWorkHoursRepository;
    private final VacationRepository vacationRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final JwtService jwtService;
    private final PasswordResetService passwordResetService;
    private final RestaurantService restaurantService;
    private final BillingService billingService;
    private final EmailService emailService;
    private final EmailVerificationService emailVerificationService;
    private final AuditService auditService;
    private final TokenDenylistService tokenDenylistService;
    private final long refreshTokenTtlDays;

    public AuthService(UserAccountRepository userAccountRepository,
                       UserRestaurantRepository userRestaurantRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       StaffShiftAssignmentRepository staffShiftAssignmentRepository,
                       StaffWeeklyWorkHoursRepository staffWeeklyWorkHoursRepository,
                       VacationRepository vacationRepository,
                       PasswordEncoder passwordEncoder,
                       TokenService tokenService,
                       JwtService jwtService,
                       PasswordResetService passwordResetService,
                       RestaurantService restaurantService,
                       BillingService billingService,
                       EmailService emailService,
                       EmailVerificationService emailVerificationService,
                       AuditService auditService,
                       TokenDenylistService tokenDenylistService,
                       @Value("${app.security.jwt.refresh-token-ttl-days}") long refreshTokenTtlDays) {
        this.userAccountRepository = userAccountRepository;
        this.userRestaurantRepository = userRestaurantRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.staffShiftAssignmentRepository = staffShiftAssignmentRepository;
        this.staffWeeklyWorkHoursRepository = staffWeeklyWorkHoursRepository;
        this.vacationRepository = vacationRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.jwtService = jwtService;
        this.passwordResetService = passwordResetService;
        this.restaurantService = restaurantService;
        this.billingService = billingService;
        this.emailService = emailService;
        this.emailVerificationService = emailVerificationService;
        this.auditService = auditService;
        this.tokenDenylistService = tokenDenylistService;
        this.refreshTokenTtlDays = refreshTokenTtlDays;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        UserAccount user = null;
        String failureReason = "INVALID_CREDENTIALS";
        try {
            user = userAccountRepository.findByEmail(normalizedEmail)
                    .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

            if (!user.isEnabled()) {
                failureReason = "USER_DISABLED";
                throw new BadCredentialsException("Invalid credentials");
            }
            if (user.getStatus() != UserAccountStatus.ACTIVE) {
                failureReason = "USER_INACTIVE";
                throw new BadCredentialsException("Invalid credentials");
            }

            if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
                failureReason = "PASSWORD_MISMATCH";
                throw new BadCredentialsException("Invalid credentials");
            }

            if (!user.isEmailVerified()) {
                failureReason = "EMAIL_UNVERIFIED";
                throw new EmailNotVerifiedException();
            }

            AuthResponse response = issueTokens(user, Instant.now());
            auditAuthEvent(AuditEventType.LOGIN_SUCCESS, user.getId(), normalizedEmail,
                    Map.of("outcome", "SUCCESS"));
            return response;
        } catch (EmailNotVerifiedException ex) {
            auditAuthEvent(AuditEventType.LOGIN_FAILURE, user == null ? null : user.getId(), normalizedEmail,
                    Map.of("outcome", "FAILURE", "reason", failureReason));
            throw ex;
        } catch (BadCredentialsException ex) {
            auditAuthEvent(AuditEventType.LOGIN_FAILURE, user == null ? null : user.getId(), normalizedEmail,
                    Map.of("outcome", "FAILURE", "reason", failureReason));
            throw ex;
        }
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        if (userAccountRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            throw new ConflictException("Account with this email already exists", "email");
        }
        try {
            UserAccount user = new UserAccount(normalizedEmail, passwordEncoder.encode(request.password()));
            user.markEmailUnverified();
            user.setFullName(trimToNull(request.ownerName()));
            user.setPhone(trimToNull(request.ownerPhone()));
            UserAccount savedUser = userAccountRepository.save(user);
            emailVerificationService.sendVerification(savedUser);
            auditAuthEvent(AuditEventType.USER_REGISTERED, savedUser.getId(), savedUser.getEmail(),
                    Map.of("outcome", "SUCCESS", "verificationRequired", true));
            return new RegisterResponse(savedUser.getEmail(), true);
        } catch (DataIntegrityViolationException ex) {
            throw mapRegistrationIntegrityViolation(ex);
        }
    }

    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        UserAccount user = emailVerificationService.verify(request.token());
        AuthResponse response = issueTokens(user, Instant.now());
        auditAuthEvent(AuditEventType.EMAIL_VERIFIED, user.getId(), user.getEmail(),
                Map.of("outcome", "SUCCESS"));
        return response;
    }

    @Transactional
    public void resendVerification(ResendVerificationRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        emailVerificationService.resend(normalizedEmail);
        auditAuthEvent(AuditEventType.EMAIL_VERIFICATION_RESENT, null, normalizedEmail,
                Map.of("outcome", "ACCEPTED"));
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        String rawToken = request.refreshToken();
        String tokenHash = tokenService.hashToken(rawToken);
        RefreshToken refreshToken = findActiveRefreshTokenForUpdate(tokenHash)
                .orElseThrow(() -> {
                    detectReplayAndRevokeSessions(tokenHash);
                    auditAuthEvent(AuditEventType.TOKEN_REFRESH_FAILED, null, null,
                            Map.of("outcome", "FAILURE", "reason", "TOKEN_NOT_FOUND_OR_REPLAYED"));
                    return new BadCredentialsException("Invalid refresh token");
                });

        Instant now = Instant.now();
        if (refreshToken.getExpiresAtUtc().isBefore(now)) {
            refreshToken.setRevoked(true);
            refreshTokenRepository.save(refreshToken);
            auditAuthEvent(AuditEventType.TOKEN_REFRESH_FAILED, refreshToken.getUser().getId(), null,
                    Map.of("outcome", "FAILURE", "reason", "TOKEN_EXPIRED"));
            throw new BadCredentialsException("Invalid refresh token");
        }

        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);

        UserAccount user = refreshToken.getUser();
        if (!user.isEnabled() || user.getStatus() != UserAccountStatus.ACTIVE) {
            refreshTokenRepository.revokeAllForUser(user.getId());
            auditAuthEvent(AuditEventType.TOKEN_REFRESH_FAILED, user.getId(), user.getEmail(),
                    Map.of("outcome", "FAILURE", "reason", "USER_INACTIVE"));
            throw new BadCredentialsException("Invalid refresh token");
        }
        if (!user.isEmailVerified()) {
            refreshTokenRepository.revokeAllForUser(user.getId());
            auditAuthEvent(AuditEventType.TOKEN_REFRESH_FAILED, user.getId(), user.getEmail(),
                    Map.of("outcome", "FAILURE", "reason", "EMAIL_UNVERIFIED"));
            throw new EmailNotVerifiedException();
        }
        AuthResponse response = issueTokens(user, now);
        auditAuthEvent(AuditEventType.TOKEN_REFRESHED, user.getId(), user.getEmail(),
                Map.of("outcome", "SUCCESS"));
        return response;
    }

    @Transactional
    public void logout(LogoutRequest request) {
        String rawToken = request.refreshToken();
        String tokenHash = tokenService.hashToken(rawToken);

        RefreshToken refreshToken = findActiveRefreshTokenForUpdate(tokenHash)
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));
        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);
        tokenDenylistService.denyUser(refreshToken.getUser().getId());
        auditAuthEvent(AuditEventType.LOGOUT, refreshToken.getUser().getId(), refreshToken.getUser().getEmail(),
                Map.of("outcome", "SUCCESS"));
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        Optional<UserAccount> existingUser = userAccountRepository.findByEmailIgnoreCase(normalizedEmail);
        passwordResetService.requestReset(request.email());
        auditAuthEvent(
                AuditEventType.PASSWORD_RESET_REQUESTED,
                existingUser.map(UserAccount::getId).orElse(null),
                normalizedEmail,
                Map.of("outcome", "ACCEPTED", "accountPresent", existingUser.isPresent())
        );
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
        auditAuthEvent(AuditEventType.PASSWORD_RESET_COMPLETED, null, null,
                Map.of("outcome", "SUCCESS"));
    }

    @Transactional(readOnly = true)
    public CurrentUserResponse getCurrentUser(Long userId) {
        UserAccount user = requireActiveUser(userId);
        List<AuthRestaurantSummary> restaurants = userRestaurantRepository.findRestaurantSummariesByUserId(userId);
        return new CurrentUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                restaurants,
                user.getMaxRestaurants()
        );
    }

    @Transactional
    public CurrentUserResponse updateCurrentUser(Long userId, UpdateCurrentUserRequest request) {
        UserAccount user = requireActiveUser(userId);

        String normalizedEmail = normalizeEmail(request.email());
        if (!normalizedEmail.equalsIgnoreCase(user.getEmail()) && userAccountRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ConflictException("Account with this email already exists", "email");
        }

        user.setEmail(normalizedEmail);
        user.setFullName(trimToNull(request.fullName()));
        user.setPhone(trimToNull(request.phone()));
        userAccountRepository.save(user);
        auditAuthEvent(AuditEventType.USER_UPDATED, userId, user.getEmail(),
                Map.of("outcome", "SUCCESS"));

        List<AuthRestaurantSummary> restaurants = userRestaurantRepository.findRestaurantSummariesByUserId(userId);
        return new CurrentUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                restaurants,
                user.getMaxRestaurants()
        );
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        UserAccount user = requireActiveUser(userId);

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ValidationException("Current password is incorrect", "currentPassword");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userAccountRepository.save(user);
        refreshTokenRepository.revokeAllForUser(userId);
        try {
            emailService.sendPasswordChangedNotice(user.getEmail());
        } catch (Exception ex) {
            log.warn("Failed to send password changed notice for user {}", userId);
        }
        auditAuthEvent(AuditEventType.PASSWORD_CHANGED, userId, user.getEmail(),
                Map.of("outcome", "SUCCESS"));
    }

    @Transactional
    public void deleteCurrentUser(Long userId, DeleteCurrentUserRequest request) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User", userId));

        if (user.getStatus() == UserAccountStatus.DELETED) {
            return;
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ValidationException("Password is incorrect", "password");
        }
        if (!ACCOUNT_DELETE_CONFIRM_PHRASE.equals(request.confirmPhrase().trim())) {
            throw new ValidationException(
                    "Type DELETE to confirm account deletion",
                    "confirmPhrase"
            );
        }

        List<UserRestaurant> memberships = userRestaurantRepository.findByUserIdWithRestaurant(userId);
        List<UserRestaurant> ownedMemberships = memberships.stream()
                .filter(membership -> membership.getRole() == RestaurantRole.OWNER)
                .toList();

        Set<Long> ownedRestaurantIds = ownedMemberships.stream()
                .map(membership -> membership.getRestaurant().getId())
                .collect(Collectors.toSet());

        notifyOwnersForNonOwnedMemberships(user, memberships, ownedRestaurantIds);

        for (UserRestaurant ownedMembership : ownedMemberships) {
            restaurantService.markDeleted(ownedMembership.getRestaurant().getId());
        }

        // Clear dependents that block or orphan around user_restaurant / user_account removal.
        staffShiftAssignmentRepository.deleteByUser_Id(userId);
        staffWeeklyWorkHoursRepository.deleteByUser_Id(userId);
        vacationRepository.deleteByUserId(userId);
        passwordResetTokenRepository.deleteByUser_Id(userId);

        userRestaurantRepository.deleteByUser_Id(userId);
        refreshTokenRepository.revokeAllForUser(userId);
        refreshTokenRepository.deleteByUserIdAndRevokedOrExpired(userId, Instant.now());
        refreshTokenRepository.deleteByUser_Id(userId);
        // Immediately block any active access tokens for this user.
        tokenDenylistService.denyUser(userId);

        billingService.cancelBillingForAccountDeletion(user);

        user.setEnabled(false);
        user.setStatus(UserAccountStatus.DELETED);
        user.setDeletedAtUtc(Instant.now());
        user.setFullName(null);
        user.setPhone(null);
        user.setPasswordHash(passwordEncoder.encode("deleted-" + UUID.randomUUID()));
        user.setEmail("deleted-user-" + userId + "@anonymized.invalid");
        userAccountRepository.save(user);

        log.info("Soft deleted account for user {}", userId);
        auditAuthEvent(AuditEventType.USER_DELETED, userId, null,
                Map.of("outcome", "SUCCESS", "ownedRestaurantCount", ownedRestaurantIds.size()));
    }

    private Optional<RefreshToken> findActiveRefreshTokenForUpdate(String tokenHash) {
        return refreshTokenRepository.findActiveByTokenForUpdate(tokenHash);
    }

    private UserAccount requireActiveUser(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User", userId));
        if (user.getStatus() != UserAccountStatus.ACTIVE || !user.isEnabled()) {
            throw new NotFoundException("User", userId);
        }
        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException();
        }
        return user;
    }

    private void detectReplayAndRevokeSessions(String tokenHash) {
        Optional<RefreshToken> usedToken = refreshTokenRepository.findByToken(tokenHash);
        if (usedToken.isPresent() && usedToken.get().isRevoked()) {
            refreshTokenRepository.revokeAllForUser(usedToken.get().getUser().getId());
        }
    }

    private void persistRefreshToken(UserAccount user, String rawToken, Instant now) {
        String tokenHash = tokenService.hashToken(rawToken);
        Instant expiresAt = now.plus(refreshTokenTtlDays, ChronoUnit.DAYS);
        refreshTokenRepository.save(new RefreshToken(user, tokenHash, expiresAt));
    }

    private AuthResponse issueTokens(UserAccount user, Instant now) {
        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException();
        }
        List<AuthRestaurantSummary> restaurants = userRestaurantRepository
                .findRestaurantSummariesByUserId(user.getId());
        String accessToken = jwtService.generateAccessToken(
                user.getId(), user.getEmail(), restaurants, user.getMaxRestaurants());
        String refreshToken = tokenService.generateToken();
        persistRefreshToken(user, refreshToken, now);
        return new AuthResponse(accessToken, refreshToken, jwtService.getAccessTokenTtlSeconds());
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ConflictException mapRegistrationIntegrityViolation(DataIntegrityViolationException ex) {
        String rawMessage = ex.getMostSpecificCause() != null
                ? ex.getMostSpecificCause().getMessage()
                : ex.getMessage();
        String message = rawMessage == null ? "" : rawMessage.toLowerCase(Locale.ROOT);

        if (message.contains("user_account") && message.contains("email")) {
            return new ConflictException("Account with this email already exists", "email");
        }
        if (message.contains("restaurant") && message.contains("slug")) {
            return new ConflictException("Restaurant with this slug already exists", "restaurantSlug");
        }
        return new ConflictException("Account setup conflict. Please review your details.");
    }

    private void notifyOwnersForNonOwnedMemberships(UserAccount deletedUser,
                                                    List<UserRestaurant> memberships,
                                                    Set<Long> ownedRestaurantIds) {
        String removedUserEmail = deletedUser.getEmail();

        memberships.stream()
                .filter(membership -> membership.getRole() != RestaurantRole.OWNER)
                .filter(membership -> !ownedRestaurantIds.contains(membership.getRestaurant().getId()))
                .forEach(membership -> {
                    Long restaurantId = membership.getRestaurant().getId();
                    String restaurantName = membership.getRestaurant().getName();
                    List<UserRestaurant> owners = userRestaurantRepository.findByRestaurantIdAndRoleWithUser(
                            restaurantId, RestaurantRole.OWNER);
                    for (UserRestaurant ownerMembership : owners) {
                        Long ownerUserId = ownerMembership.getUser().getId();
                        if (ownerUserId != null && ownerUserId.equals(deletedUser.getId())) {
                            continue;
                        }
                        try {
                            emailService.sendAccountDeletionNoticeToOwner(
                                    ownerMembership.getUser().getEmail(),
                                    removedUserEmail,
                                    restaurantName
                            );
                        } catch (Exception ex) {
                            log.warn("Failed to send account deletion notice for restaurant {} to owner {}",
                                    restaurantId, ownerUserId);
                        }
                    }
                });
    }

    private void auditAuthEvent(String eventType, Long userId, String email, Map<String, Object> details) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        if (email != null && !email.isBlank()) {
            metadata.put("email", email);
        }
        if (details != null && !details.isEmpty()) {
            metadata.putAll(details);
        }
        auditService.record(eventType, null, userId, userId, "USER", metadata);
    }
}
