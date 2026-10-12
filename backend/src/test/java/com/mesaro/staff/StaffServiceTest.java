package com.mesaro.staff;

import com.mesaro.audit.AuditService;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.infra.EmailService;
import com.mesaro.infra.TimeService;
import com.mesaro.infra.TokenService;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.security.RestaurantRole;
import com.mesaro.security.TokenDenylistService;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserRestaurant;
import com.mesaro.user.UserRestaurantId;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserRestaurantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StaffServiceTest {

    @Mock
    private RestaurantService restaurantService;
    @Mock
    private UserAccountRepository userAccountRepository;
    @Mock
    private UserRestaurantRepository userRestaurantRepository;
    @Mock
    private StaffInviteRepository staffInviteRepository;
    @Mock
    private TokenService tokenService;
    @Mock
    private TimeService timeService;
    @Mock
    private EmailService emailService;
    @Mock
    private AuditService auditService;
    @Mock
    private com.mesaro.auth.JwtService jwtService;
    @Mock
    private com.mesaro.auth.RefreshTokenRepository refreshTokenRepository;
    @Mock
    private TokenDenylistService tokenDenylistService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JdbcTemplate jdbcTemplate;

    private StaffService staffService;

    @BeforeEach
    void setUp() {
        staffService = new StaffService(
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
                jdbcTemplate,
                72,
                7
        );
    }

    @Test
    void createInvite_valid_createsAndSends() {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);

        InviteStaffRequest request = new InviteStaffRequest("Invitee@Example.com", "Test", "Invitee", RestaurantRole.STAFF);

        when(userAccountRepository.findByEmailIgnoreCase("invitee@example.com")).thenReturn(Optional.empty());
        when(staffInviteRepository.findLatestActiveByRestaurantAndEmail(eq(1L), eq("invitee@example.com"), any(Instant.class)))
                .thenReturn(Optional.empty());
        when(restaurantService.findById(1L)).thenReturn(restaurant);
        when(timeService.now()).thenReturn(Instant.parse("2025-01-01T00:00:00Z"));
        when(tokenService.generateToken()).thenReturn("raw-token");
        when(tokenService.hashToken("raw-token")).thenReturn("hash-token");
        when(staffInviteRepository.save(any(StaffInvite.class))).thenAnswer(invocation -> invocation.getArgument(0));

        StaffService.StaffInviteWithToken result = staffService.createInvite(1L, request, 9L);

        assertThat(result.token()).isEqualTo("raw-token");
        ArgumentCaptor<StaffInvite> inviteCaptor = ArgumentCaptor.forClass(StaffInvite.class);
        verify(staffInviteRepository).save(inviteCaptor.capture());
        assertThat(inviteCaptor.getValue().getEmail()).isEqualTo("invitee@example.com");
        verify(emailService).sendStaffInvite("invitee@example.com", "Test", RestaurantRole.STAFF, "raw-token");
    }

    @Test
    void createInvite_ownerRole_throwsValidation() {
        InviteStaffRequest request = new InviteStaffRequest("owner@example.com", "Owner", "User", RestaurantRole.OWNER);

        assertThatThrownBy(() -> staffService.createInvite(1L, request, 9L))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void removeMember_revokesAllSessionsForRemovedUser() {
        UserAccount removedUser = buildUser(22L, "removed@example.com");
        Restaurant restaurant = new Restaurant("Demo", "demo", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 7L);
        UserRestaurant member = new UserRestaurant(removedUser, restaurant, RestaurantRole.STAFF);

        when(userRestaurantRepository.findById(new UserRestaurantId(22L, 7L))).thenReturn(Optional.of(member));

        staffService.removeMember(7L, 22L, 99L);

        verify(userRestaurantRepository).delete(member);
        verify(refreshTokenRepository).revokeAllForUser(22L);
        verify(tokenDenylistService).denyUser(22L);
        verify(auditService).record(
                eq(com.mesaro.audit.AuditEventType.STAFF_REMOVED),
                eq(7L),
                eq(99L),
                eq(22L),
                eq("STAFF_MEMBER"),
                any()
        );
        verify(emailService, never()).sendStaffInvite(any(), any(), any(), any());
    }

    private UserAccount buildUser(Long id, String email) {
        UserAccount user = new UserAccount(email, "hash");
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
