package com.mesaro.auth;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.billing.BillingService;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.infra.TokenService;
import com.mesaro.infra.EmailService;
import com.mesaro.planning.StaffShiftAssignmentRepository;
import com.mesaro.planning.StaffWeeklyWorkHoursRepository;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.security.RestaurantRole;
import com.mesaro.security.TokenDenylistService;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserAccountStatus;
import com.mesaro.user.UserRestaurant;
import com.mesaro.user.UserRestaurantRepository;
import com.mesaro.vacation.VacationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.anyInt;
import static org.mockito.Mockito.anyLong;
import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;
    @Mock
    private UserRestaurantRepository userRestaurantRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private StaffShiftAssignmentRepository staffShiftAssignmentRepository;
    @Mock
    private StaffWeeklyWorkHoursRepository staffWeeklyWorkHoursRepository;
    @Mock
    private VacationRepository vacationRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private TokenService tokenService;
    @Mock
    private JwtService jwtService;
    @Mock
    private PasswordResetService passwordResetService;
    @Mock
    private RestaurantService restaurantService;
    @Mock
    private BillingService billingService;
    @Mock
    private EmailService emailService;
    @Mock
    private EmailVerificationService emailVerificationService;
    @Mock
    private AuditService auditService;
    @Mock
    private TokenDenylistService tokenDenylistService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userAccountRepository,
                userRestaurantRepository,
                refreshTokenRepository,
                passwordResetTokenRepository,
                staffShiftAssignmentRepository,
                staffWeeklyWorkHoursRepository,
                vacationRepository,
                passwordEncoder,
                tokenService,
                jwtService,
                passwordResetService,
                restaurantService,
                billingService,
                emailService,
                emailVerificationService,
                auditService,
                tokenDenylistService,
                7
        );
    }

    @Test
    void login_storesRefreshTokenAsHash() {
        UserAccount user = buildUser(101L, "user@example.com");
        when(userAccountRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", user.getPasswordHash())).thenReturn(true);
        when(userRestaurantRepository.findRestaurantSummariesByUserId(101L)).thenReturn(List.of());
        when(jwtService.generateAccessToken(101L, "user@example.com", List.of(), 1)).thenReturn("access");
        when(jwtService.getAccessTokenTtlSeconds()).thenReturn(900L);
        when(tokenService.generateToken()).thenReturn("raw-refresh");
        when(tokenService.hashToken("raw-refresh")).thenReturn("hashed-refresh");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse response = authService.login(new LoginRequest("user@example.com", "secret"));

        assertThat(response.refreshToken()).isEqualTo("raw-refresh");
        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        assertThat(captor.getValue().getToken()).isEqualTo("hashed-refresh");
        verify(auditService).record(
                org.mockito.ArgumentMatchers.eq(AuditEventType.LOGIN_SUCCESS),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(101L),
                org.mockito.ArgumentMatchers.eq(101L),
                org.mockito.ArgumentMatchers.eq("USER"),
                org.mockito.ArgumentMatchers.anyMap()
        );
    }

    @Test
    void refresh_rotatesTokenAndRevokesOldToken() {
        UserAccount user = buildUser(101L, "user@example.com");
        RefreshToken existing = new RefreshToken(user, "old-hash", Instant.now().plusSeconds(3600));
        when(tokenService.hashToken("old-raw")).thenReturn("old-hash");
        when(refreshTokenRepository.findActiveByTokenForUpdate("old-hash")).thenReturn(Optional.of(existing));
        when(userRestaurantRepository.findRestaurantSummariesByUserId(101L)).thenReturn(List.of());
        when(jwtService.generateAccessToken(101L, "user@example.com", List.of(), 1)).thenReturn("new-access");
        when(jwtService.getAccessTokenTtlSeconds()).thenReturn(900L);
        when(tokenService.generateToken()).thenReturn("new-raw");
        when(tokenService.hashToken("new-raw")).thenReturn("new-hash");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse response = authService.refresh(new RefreshRequest("old-raw"));

        assertThat(response.accessToken()).isEqualTo("new-access");
        assertThat(response.refreshToken()).isEqualTo("new-raw");

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        List<RefreshToken> saved = captor.getAllValues();
        assertThat(saved.get(0)).isSameAs(existing);
        assertThat(saved.get(0).isRevoked()).isTrue();
        assertThat(saved.get(1).getToken()).isEqualTo("new-hash");
    }

    @Test
    void refresh_withRevokedToken_detectsReplayAndRevokesAllSessions() {
        UserAccount user = buildUser(222L, "user@example.com");
        RefreshToken revoked = new RefreshToken(user, "old-hash", Instant.now().plusSeconds(3600));
        revoked.setRevoked(true);

        when(tokenService.hashToken("old-raw")).thenReturn("old-hash");
        when(refreshTokenRepository.findActiveByTokenForUpdate("old-hash")).thenReturn(Optional.empty());
        when(refreshTokenRepository.findByToken("old-hash")).thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> authService.refresh(new RefreshRequest("old-raw")))
                .isInstanceOf(BadCredentialsException.class);

        verify(refreshTokenRepository).revokeAllForUser(222L);
        verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
    }

    @Test
    void logout_revokesRefreshTokenAndDeniesAccessTokens() {
        UserAccount user = buildUser(303L, "user@example.com");
        RefreshToken refreshToken = new RefreshToken(user, "hash", Instant.now().plusSeconds(3600));

        when(tokenService.hashToken("raw-logout")).thenReturn("hash");
        when(refreshTokenRepository.findActiveByTokenForUpdate("hash")).thenReturn(Optional.of(refreshToken));
        when(refreshTokenRepository.save(refreshToken)).thenReturn(refreshToken);

        authService.logout(new LogoutRequest("raw-logout"));

        verify(refreshTokenRepository).save(refreshToken);
        assertThat(refreshToken.isRevoked()).isTrue();
        verify(tokenDenylistService).denyUser(303L);
    }

    @Test
    void logout_rejectsLegacyPlaintextTokenLookup() {
        when(tokenService.hashToken("legacy-raw")).thenReturn("legacy-hash");
        when(refreshTokenRepository.findActiveByTokenForUpdate("legacy-hash")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.logout(new LogoutRequest("legacy-raw")))
                .isInstanceOf(BadCredentialsException.class);

        verify(refreshTokenRepository, never()).findActiveByTokenForUpdate("legacy-raw");
        verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
    }

    @Test
    void logout_unknownToken_throwsUnauthorizedError() {
        when(tokenService.hashToken("missing-raw")).thenReturn("missing-hash");
        when(refreshTokenRepository.findActiveByTokenForUpdate("missing-hash")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.logout(new LogoutRequest("missing-raw")))
                .isInstanceOf(BadCredentialsException.class);

        verify(refreshTokenRepository, never()).findActiveByTokenForUpdate("missing-raw");
        verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
        verify(auditService, never()).record(
                org.mockito.ArgumentMatchers.eq(AuditEventType.LOGOUT),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyMap()
        );
    }

    @Test
    void register_createsUnverifiedAccountAndSendsVerificationEmail() {
        when(userAccountRepository.findByEmailIgnoreCase("owner@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret123")).thenReturn("encoded-pass");

        UserAccount persistedUser = buildUser(500L, "owner@example.com");
        persistedUser.markEmailUnverified();
        when(userAccountRepository.save(any(UserAccount.class))).thenReturn(persistedUser);

        RegisterResponse response = authService.register(new RegisterRequest(
                "owner@example.com",
                "secret123",
                null,
                null
        ));

        assertThat(response.email()).isEqualTo("owner@example.com");
        assertThat(response.verificationRequired()).isTrue();
        verify(emailVerificationService).sendVerification(persistedUser);
        verify(jwtService, never()).generateAccessToken(any(), any(), any(), anyInt());
    }

    @Test
    void login_rejectsUnverifiedAccount() {
        UserAccount user = buildUser(101L, "user@example.com");
        user.markEmailUnverified();
        when(userAccountRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", user.getPasswordHash())).thenReturn(true);

        assertThatThrownBy(() -> authService.login(new LoginRequest("user@example.com", "secret")))
                .isInstanceOf(com.mesaro.common.exception.EmailNotVerifiedException.class);
        verify(jwtService, never()).generateAccessToken(any(), any(), any(), anyInt());
    }

    @Test
    void deleteCurrentUser_nonOwner_notifiesOwnersAndDeletesUser() {
        UserAccount deletedUser = buildUser(101L, "staff@example.com");
        Restaurant restaurant = buildRestaurant(30L, "Demo");
        UserRestaurant membership = new UserRestaurant(deletedUser, restaurant, RestaurantRole.STAFF);

        UserAccount owner = buildUser(202L, "owner@example.com");
        UserRestaurant ownerMembership = new UserRestaurant(owner, restaurant, RestaurantRole.OWNER);

        when(userAccountRepository.findById(101L)).thenReturn(Optional.of(deletedUser));
        when(passwordEncoder.matches("secret", deletedUser.getPasswordHash())).thenReturn(true);
        when(passwordEncoder.encode(anyString())).thenReturn("scrubbed-hash");
        when(userRestaurantRepository.findByUserIdWithRestaurant(101L)).thenReturn(List.of(membership));
        when(userRestaurantRepository.findByRestaurantIdAndRoleWithUser(30L, RestaurantRole.OWNER))
                .thenReturn(List.of(ownerMembership));

        authService.deleteCurrentUser(101L, new DeleteCurrentUserRequest("secret", "DELETE"));

        verify(emailService).sendAccountDeletionNoticeToOwner("owner@example.com", "staff@example.com", "Demo");
        verify(restaurantService, never()).hardDelete(any());
        verify(staffShiftAssignmentRepository).deleteByUser_Id(101L);
        verify(staffWeeklyWorkHoursRepository).deleteByUser_Id(101L);
        verify(vacationRepository).deleteByUserId(101L);
        verify(passwordResetTokenRepository).deleteByUser_Id(101L);
        verify(billingService).cancelBillingForAccountDeletion(deletedUser);
        verify(userRestaurantRepository).deleteByUser_Id(101L);
        verify(refreshTokenRepository).deleteByUser_Id(101L);
        verify(userAccountRepository).save(deletedUser);
        assertThat(deletedUser.getStatus()).isEqualTo(UserAccountStatus.DELETED);
        assertThat(deletedUser.getEmail()).isEqualTo("deleted-user-101@anonymized.invalid");
    }

    @Test
    void deleteCurrentUser_owner_marksOwnedRestaurantsDeleted() {
        UserAccount ownerUser = buildUser(101L, "owner@example.com");
        Restaurant ownedRestaurant = buildRestaurant(77L, "Owned Place");
        UserRestaurant ownerMembership = new UserRestaurant(ownerUser, ownedRestaurant, RestaurantRole.OWNER);

        when(userAccountRepository.findById(101L)).thenReturn(Optional.of(ownerUser));
        when(passwordEncoder.matches("secret", ownerUser.getPasswordHash())).thenReturn(true);
        when(passwordEncoder.encode(anyString())).thenReturn("scrubbed-hash");
        when(userRestaurantRepository.findByUserIdWithRestaurant(101L)).thenReturn(List.of(ownerMembership));

        authService.deleteCurrentUser(101L, new DeleteCurrentUserRequest("secret", "DELETE"));

        verify(emailService, never()).sendAccountDeletionNoticeToOwner(any(), any(), any());
        verify(restaurantService, times(1)).markDeleted(77L);
        verify(billingService).cancelBillingForAccountDeletion(ownerUser);
        verify(userRestaurantRepository).deleteByUser_Id(101L);
        verify(refreshTokenRepository).deleteByUser_Id(101L);
        verify(userAccountRepository).save(ownerUser);
    }

    @Test
    void deleteCurrentUser_rejectsWrongPassword() {
        UserAccount user = buildUser(101L, "owner@example.com");
        when(userAccountRepository.findById(101L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", user.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> authService.deleteCurrentUser(101L, new DeleteCurrentUserRequest("wrong", "DELETE")))
                .isInstanceOf(ValidationException.class);

        verify(restaurantService, never()).markDeleted(anyLong());
        verify(userRestaurantRepository, never()).deleteByUser_Id(anyLong());
        verify(billingService, never()).cancelBillingForAccountDeletion(any());
    }

    @Test
    void deleteCurrentUser_rejectsWrongConfirmPhrase() {
        UserAccount user = buildUser(101L, "owner@example.com");
        when(userAccountRepository.findById(101L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", user.getPasswordHash())).thenReturn(true);

        assertThatThrownBy(() -> authService.deleteCurrentUser(101L, new DeleteCurrentUserRequest("secret", "delete")))
                .isInstanceOf(ValidationException.class);

        verify(restaurantService, never()).markDeleted(anyLong());
        verify(billingService, never()).cancelBillingForAccountDeletion(any());
    }

    private UserAccount buildUser(Long id, String email) {
        UserAccount user = new UserAccount(email, "password-hash");
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private Restaurant buildRestaurant(Long id, String name) {
        Restaurant restaurant = new Restaurant(name, "slug-" + id, "Europe/Brussels");
        ReflectionTestUtils.setField(restaurant, "id", id);
        return restaurant;
    }
}
