package com.mesaro.staff;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.auth.AuthRestaurantSummary;
import com.mesaro.auth.AuthResponse;
import com.mesaro.auth.JwtService;
import com.mesaro.auth.RefreshToken;
import com.mesaro.auth.RefreshTokenRepository;
import com.mesaro.auth.UserLastLogin;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.NotFoundException;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.infra.EmailService;
import com.mesaro.infra.TimeService;
import com.mesaro.infra.TokenService;
import com.mesaro.planning.StaffShiftAssignment;
import com.mesaro.planning.StaffShiftAssignmentRepository;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.security.RestaurantRole;
import com.mesaro.security.TokenDenylistService;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserRestaurant;
import com.mesaro.user.UserRestaurantId;
import com.mesaro.user.UserRestaurantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class StaffService {

    private static final Logger log = LoggerFactory.getLogger(StaffService.class);

    private final RestaurantService restaurantService;
    private final UserAccountRepository userAccountRepository;
    private final UserRestaurantRepository userRestaurantRepository;
    private final StaffInviteRepository staffInviteRepository;
    private final TokenService tokenService;
    private final TimeService timeService;
    private final EmailService emailService;
    private final AuditService auditService;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TokenDenylistService tokenDenylistService;
    private final PasswordEncoder passwordEncoder;
    private final StaffShiftAssignmentRepository assignmentRepository;
    private final JdbcTemplate jdbcTemplate;
    private final long inviteTtlHours;
    private final long refreshTokenTtlDays;

    @Autowired
    public StaffService(RestaurantService restaurantService,
                        UserAccountRepository userAccountRepository,
                        UserRestaurantRepository userRestaurantRepository,
                        StaffInviteRepository staffInviteRepository,
                        TokenService tokenService,
                        TimeService timeService,
                        EmailService emailService,
                        AuditService auditService,
                        JwtService jwtService,
                        RefreshTokenRepository refreshTokenRepository,
                        TokenDenylistService tokenDenylistService,
                        PasswordEncoder passwordEncoder,
                        StaffShiftAssignmentRepository assignmentRepository,
                        JdbcTemplate jdbcTemplate,
                        @Value("${app.staff.invite-ttl-hours:72}") long inviteTtlHours,
                        @Value("${app.security.jwt.refresh-token-ttl-days}") long refreshTokenTtlDays) {
        this.restaurantService = restaurantService;
        this.userAccountRepository = userAccountRepository;
        this.userRestaurantRepository = userRestaurantRepository;
        this.staffInviteRepository = staffInviteRepository;
        this.tokenService = tokenService;
        this.timeService = timeService;
        this.emailService = emailService;
        this.auditService = auditService;
        this.jwtService = jwtService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.tokenDenylistService = tokenDenylistService;
        this.passwordEncoder = passwordEncoder;
        this.assignmentRepository = assignmentRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.inviteTtlHours = inviteTtlHours;
        this.refreshTokenTtlDays = refreshTokenTtlDays;
    }

    public StaffService(RestaurantService restaurantService,
                        UserAccountRepository userAccountRepository,
                        UserRestaurantRepository userRestaurantRepository,
                        StaffInviteRepository staffInviteRepository,
                        TokenService tokenService,
                        TimeService timeService,
                        EmailService emailService,
                        AuditService auditService,
                        JwtService jwtService,
                        RefreshTokenRepository refreshTokenRepository,
                        TokenDenylistService tokenDenylistService,
                        PasswordEncoder passwordEncoder,
                        JdbcTemplate jdbcTemplate,
                        @Value("${app.staff.invite-ttl-hours:72}") long inviteTtlHours,
                        @Value("${app.security.jwt.refresh-token-ttl-days}") long refreshTokenTtlDays) {
        this(
                restaurantService,
                userAccountRepository,
                userRestaurantRepository,
                staffInviteRepository,
                tokenService,
                timeService,
                emailService,
                auditService,
                jwtService,
                refreshTokenRepository,
                tokenDenylistService,
                passwordEncoder,
                null,
                jdbcTemplate,
                inviteTtlHours,
                refreshTokenTtlDays
        );
    }

    public List<UserRestaurant> listMembers(Long restaurantId) {
        return userRestaurantRepository.findByRestaurantIdWithUser(restaurantId);
    }

    public List<StaffInvite> listActiveInvites(Long restaurantId) {
        return staffInviteRepository.findActiveByRestaurant(restaurantId, timeService.now());
    }

    public Map<Long, Instant> findLastLoginByUserIds(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        return refreshTokenRepository.findLastLoginByUserIds(userIds).stream()
                .collect(Collectors.toMap(UserLastLogin::userId, UserLastLogin::lastLoginAt));
    }

    @Transactional
    public StaffInviteWithToken createInvite(Long restaurantId, InviteStaffRequest request, Long invitedByUserId) {
        RestaurantRole role = validateInviteRole(request.role());
        String email = normalizeEmail(request.email());
        String firstName = normalizeRequiredName(request.firstName(), "firstName", "First name");
        String lastName = normalizeRequiredName(request.lastName(), "lastName", "Last name");

        Optional<UserAccount> existing = userAccountRepository.findByEmailIgnoreCase(email);
        if (existing.isPresent()
                && userRestaurantRepository.existsByUser_IdAndRestaurant_Id(existing.get().getId(), restaurantId)) {
            throw new ConflictException("User is already a member of this restaurant");
        }

        staffInviteRepository.findLatestActiveByRestaurantAndEmail(restaurantId, email, timeService.now())
                .ifPresent(invite -> {
                    throw new ConflictException("Active invite already exists for this email");
                });

        Restaurant restaurant = restaurantService.findById(restaurantId);
        StaffInviteWithToken inviteWithToken = buildInvite(restaurant, email, firstName, lastName, role, invitedByUserId);

        StaffInvite saved = staffInviteRepository.save(inviteWithToken.invite());
        emailService.sendStaffInvite(email, restaurant.getName(), role, inviteWithToken.token());

        auditService.record(
                AuditEventType.STAFF_INVITED,
                restaurantId,
                invitedByUserId,
                saved.getId(),
                "STAFF_INVITE",
                Map.of(
                        "email", saved.getEmail(),
                        "firstName", saved.getFirstName(),
                        "lastName", saved.getLastName(),
                        "role", saved.getRole().name()
                )
        );
        return new StaffInviteWithToken(saved, inviteWithToken.token());
    }

    @Transactional
    public StaffInviteWithToken resendInvite(Long restaurantId, Long inviteId) {
        StaffInvite invite = staffInviteRepository.findByIdAndRestaurant_Id(inviteId, restaurantId)
                .orElseThrow(() -> new NotFoundException("StaffInvite", inviteId));

        if (invite.getAcceptedAtUtc() != null) {
            throw new ConflictException("Invite has already been accepted");
        }
        if (invite.getRevokedAtUtc() != null) {
            throw new ConflictException("Invite has been revoked");
        }

        String rawToken = refreshInvite(invite);
        StaffInvite saved = staffInviteRepository.save(invite);
        emailService.sendStaffInvite(invite.getEmail(),
                invite.getRestaurant().getName(),
                invite.getRole(),
                rawToken);
        auditService.record(
                AuditEventType.STAFF_INVITE_RESENT,
                restaurantId,
                null,
                saved.getId(),
                "STAFF_INVITE",
                Map.of("role", saved.getRole().name())
        );
        return new StaffInviteWithToken(saved, rawToken);
    }

    public StaffInvitePreviewResponse previewInvite(String inviteToken) {
        String rawToken = validateInviteToken(inviteToken);
        String tokenHash = tokenService.hashToken(rawToken);

        StaffInvite invite = staffInviteRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ValidationException("Invalid or expired invite token", "inviteToken"));

        if (!tokenService.verifyToken(rawToken, invite.getTokenHash())) {
            throw new ValidationException("Invalid or expired invite token", "inviteToken");
        }

        Instant now = timeService.now();
        boolean alreadyAccepted = invite.getAcceptedAtUtc() != null;
        boolean expired = invite.getRevokedAtUtc() != null || invite.getExpiresAtUtc().isBefore(now);
        boolean passwordRequired = userAccountRepository.findByEmailIgnoreCase(invite.getEmail()).isEmpty();

        return new StaffInvitePreviewResponse(
                invite.getRestaurant().getName(),
                invite.getRole(),
                invite.getEmail(),
                passwordRequired,
                expired && !alreadyAccepted,
                alreadyAccepted
        );
    }

    @Transactional
    public AuthResponse acceptInvite(String inviteToken, String password) {
        String rawToken = validateInviteToken(inviteToken);
        String tokenHash = tokenService.hashToken(rawToken);

        StaffInvite invite = staffInviteRepository.findByTokenHashForUpdate(tokenHash)
                .orElseThrow(() -> new ValidationException("Invalid or expired invite token", "inviteToken"));

        if (!tokenService.verifyToken(rawToken, invite.getTokenHash())) {
            throw new ValidationException("Invalid or expired invite token", "inviteToken");
        }

        Instant now = timeService.now();
        if (invite.getAcceptedAtUtc() != null) {
            throw new ConflictException("Invite has already been accepted");
        }
        if (invite.getRevokedAtUtc() != null) {
            throw new ConflictException("Invite has been revoked");
        }
        if (invite.getExpiresAtUtc().isBefore(now)) {
            throw new ConflictException("Invite has expired");
        }

        Optional<UserAccount> existingUser = userAccountRepository.findByEmailIgnoreCase(invite.getEmail());
        UserAccount user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
        } else {
            if (password == null || password.isBlank()) {
                throw new ValidationException("Password is required for new accounts", "password");
            }
            String passwordHash = passwordEncoder.encode(password);
            UserAccount account = new UserAccount(invite.getEmail(), passwordHash);
            account.setFullName(composeFullName(invite.getFirstName(), invite.getLastName()));
            user = userAccountRepository.save(account);
        }

        if ((user.getFullName() == null || user.getFullName().isBlank())
                && invite.getFirstName() != null
                && invite.getLastName() != null) {
            user.setFullName(composeFullName(invite.getFirstName(), invite.getLastName()));
            user = userAccountRepository.save(user);
        }

        Long restaurantId = invite.getRestaurant().getId();
        Optional<UserRestaurant> existingMembership =
                userRestaurantRepository.findById(new UserRestaurantId(user.getId(), restaurantId));
        if (existingMembership.isPresent()) {
            UserRestaurant existing = existingMembership.get();
            existing.setRole(invite.getRole());
            userRestaurantRepository.save(existing);
        } else {
            userRestaurantRepository.save(new UserRestaurant(user, invite.getRestaurant(), invite.getRole()));
        }

        invite.markAccepted(now);
        staffInviteRepository.save(invite);
        auditService.record(
                AuditEventType.STAFF_INVITE_ACCEPTED,
                invite.getRestaurant().getId(),
                user.getId(),
                invite.getId(),
                "STAFF_INVITE",
                Map.of(
                        "email", invite.getEmail(),
                        "role", invite.getRole().name(),
                        "restaurantId", invite.getRestaurant().getId()
                )
        );

        List<AuthRestaurantSummary> restaurants =
                userRestaurantRepository.findRestaurantSummariesByUserId(user.getId());
        String accessToken = jwtService.generateAccessToken(
                user.getId(),
                user.getEmail(),
                restaurants,
                user.getMaxRestaurants()
        );
        String refreshToken = tokenService.generateToken();
        String refreshTokenHash = tokenService.hashToken(refreshToken);
        Instant refreshExpires = now.plus(refreshTokenTtlDays, ChronoUnit.DAYS);
        refreshTokenRepository.save(new RefreshToken(user, refreshTokenHash, refreshExpires));

        return new AuthResponse(accessToken, refreshToken, jwtService.getAccessTokenTtlSeconds());
    }

    @Transactional
    public UserRestaurant updateMemberRole(Long restaurantId, Long userId, RestaurantRole role, Long actorUserId) {
        RestaurantRole newRole = validateManageRole(role);
        UserRestaurant member = userRestaurantRepository.findByIdWithUser(
                        new com.mesaro.user.UserRestaurantId(userId, restaurantId))
                .orElseThrow(() -> new NotFoundException("Staff member", userId));

        if (member.getRole() == RestaurantRole.OWNER) {
            throw new ConflictException("Owner role cannot be modified");
        }

        RestaurantRole previousRole = member.getRole();
        member.setRole(newRole);
        UserRestaurant saved = userRestaurantRepository.save(member);
        tokenDenylistService.denyUser(userId);

        auditService.record(
                AuditEventType.STAFF_ROLE_CHANGED,
                restaurantId,
                actorUserId,
                userId,
                "STAFF_MEMBER",
                Map.of(
                        "previousRole", previousRole.name(),
                        "newRole", newRole.name()
                )
        );
        return saved;
    }

    @Transactional
    public StaffInvite updateInviteRole(Long restaurantId, Long inviteId, RestaurantRole role) {
        RestaurantRole newRole = validateManageRole(role);
        StaffInvite invite = staffInviteRepository.findByIdAndRestaurant_Id(inviteId, restaurantId)
                .orElseThrow(() -> new NotFoundException("StaffInvite", inviteId));

        if (invite.getAcceptedAtUtc() != null) {
            throw new ConflictException("Invite has already been accepted");
        }
        if (invite.getRevokedAtUtc() != null) {
            throw new ConflictException("Invite has been revoked");
        }

        invite.setRole(newRole);
        StaffInvite saved = staffInviteRepository.save(invite);
        auditService.record(
                AuditEventType.STAFF_INVITE_ROLE_UPDATED,
                restaurantId,
                null,
                saved.getId(),
                "STAFF_INVITE",
                Map.of("role", newRole.name())
        );
        return saved;
    }

    @Transactional
    public void removeMember(Long restaurantId, Long userId, Long actorUserId) {
        UserRestaurant member = userRestaurantRepository.findByIdForUpdate(
                        new com.mesaro.user.UserRestaurantId(userId, restaurantId))
                .or(() -> userRestaurantRepository.findById(
                        new com.mesaro.user.UserRestaurantId(userId, restaurantId))
                )
                .orElseThrow(() -> new NotFoundException("Staff member", userId));

        if (member.getRole() == RestaurantRole.OWNER) {
            throw new ConflictException("Owner cannot be removed");
        }

        if (assignmentRepository != null) {
            List<StaffShiftAssignment> futureAssignments = assignmentRepository.findFutureAssignmentsForUpdate(
                    restaurantId, userId, timeService.today(ZoneOffset.UTC));
            if (!futureAssignments.isEmpty()) {
                String conflicts = futureAssignments.stream()
                        .limit(5)
                        .map(a -> "shift " + a.getShift().getId() + " on " + a.getServiceDate())
                        .collect(Collectors.joining(", "));
                throw new ConflictException("Cannot remove member with future shift assignments: " + conflicts);
            }
            assignmentRepository.deleteFutureAssignments(restaurantId, userId, timeService.today(ZoneOffset.UTC));
        }

        RestaurantRole role = member.getRole();
        String removedEmail = member.getUser() != null ? member.getUser().getEmail() : null;
        String restaurantName = member.getRestaurant() != null ? member.getRestaurant().getName() : "";
        userRestaurantRepository.delete(member);
        refreshTokenRepository.revokeAllForUser(userId);
        tokenDenylistService.denyUser(userId);

        if (removedEmail != null && !removedEmail.isBlank()) {
            String subject = "You have been removed from " + restaurantName;
            try {
                emailService.sendStaffRemovalNotice(removedEmail, restaurantName);
                jdbcTemplate.update(
                        """
                        INSERT INTO email_send_log (
                            restaurant_id, recipient_email, email_type, subject, status, sent_at_utc
                        ) VALUES (?, ?, 'STAFF_REMOVAL', ?, 'SENT', now())
                        ON CONFLICT DO NOTHING
                        """,
                        restaurantId, removedEmail, subject
                );
            } catch (Exception ex) {
                jdbcTemplate.update(
                        """
                        INSERT INTO email_send_log (
                            restaurant_id, recipient_email, email_type, subject, status, error_message, sent_at_utc
                        ) VALUES (?, ?, 'STAFF_REMOVAL', ?, 'FAILED', ?, now())
                        ON CONFLICT DO NOTHING
                        """,
                        restaurantId, removedEmail, subject, ex.getMessage()
                );
                log.warn("Failed to send staff removal notice to {} for restaurant {}: {}",
                        removedEmail, restaurantId, ex.getMessage());
            }
        }

        auditService.record(
                AuditEventType.STAFF_REMOVED,
                restaurantId,
                actorUserId,
                userId,
                "STAFF_MEMBER",
                Map.of("role", role.name())
        );
    }

    @Transactional
    public void revokeInvite(Long restaurantId, Long inviteId) {
        StaffInvite invite = staffInviteRepository.findByIdAndRestaurant_Id(inviteId, restaurantId)
                .orElseThrow(() -> new NotFoundException("StaffInvite", inviteId));
        if (invite.getAcceptedAtUtc() != null) {
            throw new ConflictException("Invite has already been accepted");
        }
        invite.markRevoked(timeService.now());
        staffInviteRepository.save(invite);
        auditService.record(
                AuditEventType.STAFF_INVITE_REVOKED,
                restaurantId,
                null,
                inviteId,
                "STAFF_INVITE",
                Map.of("role", invite.getRole().name())
        );
    }

    public Optional<UserRestaurant> findMember(Long restaurantId, Long userId) {
        return userRestaurantRepository.findByIdWithUser(
                new com.mesaro.user.UserRestaurantId(userId, restaurantId));
    }

    public Optional<StaffInvite> findInvite(Long restaurantId, Long inviteId) {
        return staffInviteRepository.findByIdAndRestaurant_Id(inviteId, restaurantId);
    }

    private StaffInviteWithToken buildInvite(Restaurant restaurant,
                                             String email,
                                             String firstName,
                                             String lastName,
                                             RestaurantRole role,
                                             Long invitedByUserId) {
        String rawToken = tokenService.generateToken();
        String tokenHash = tokenService.hashToken(rawToken);
        Instant expiresAt = timeService.now().plusSeconds(inviteTtlHours * 3600L);
        StaffInvite invite = new StaffInvite(restaurant, email, firstName, lastName, role, tokenHash, expiresAt, invitedByUserId);
        return new StaffInviteWithToken(invite, rawToken);
    }

    private String refreshInvite(StaffInvite invite) {
        String rawToken = tokenService.generateToken();
        String tokenHash = tokenService.hashToken(rawToken);
        Instant expiresAt = timeService.now().plusSeconds(inviteTtlHours * 3600L);
        invite.setTokenHash(tokenHash);
        invite.setExpiresAtUtc(expiresAt);
        return rawToken;
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ValidationException("Email is required", "email");
        }
        return email.trim().toLowerCase();
    }

    private String normalizeRequiredName(String value, String field, String label) {
        if (value == null || value.isBlank()) {
            throw new ValidationException(label + " is required", field);
        }
        String normalized = value.trim();
        if (normalized.length() > 60) {
            throw new ValidationException(label + " must not exceed 60 characters", field);
        }
        return normalized;
    }

    private String composeFullName(String firstName, String lastName) {
        String fullName = (firstName + " " + lastName).trim();
        return fullName.length() > 120 ? fullName.substring(0, 120) : fullName;
    }

    private RestaurantRole validateInviteRole(RestaurantRole role) {
        if (role == null) {
            throw new ValidationException("Role is required", "role");
        }
        if (role == RestaurantRole.OWNER) {
            throw new ValidationException("Owner role cannot be invited", "role");
        }
        return role;
    }

    private RestaurantRole validateManageRole(RestaurantRole role) {
        return validateInviteRole(role);
    }

    private String validateInviteToken(String inviteToken) {
        if (inviteToken == null || inviteToken.isBlank()) {
            throw new ValidationException("Invite token is required", "inviteToken");
        }
        return inviteToken.trim();
    }

    public record StaffInviteWithToken(StaffInvite invite, String token) {}
}
