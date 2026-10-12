package com.mesaro.billing;

import com.mesaro.common.exception.BillingAccessBlockedException;
import com.mesaro.infra.EmailService;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantStatus;
import com.mesaro.security.RestaurantRole;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserRestaurant;
import com.mesaro.user.UserRestaurantRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BillingServiceTest {

    @Mock private StripeService stripeService;
    @Mock private UserRestaurantRepository userRestaurantRepository;
    @Mock private UserAccountRepository userAccountRepository;
    @Mock private EmailService emailService;
    @Mock private JdbcTemplate jdbcTemplate;

    private BillingService billingService;

    @BeforeEach
    void setUp() {
        billingService = new BillingService(
                stripeService, userRestaurantRepository, userAccountRepository,
                emailService, jdbcTemplate);
    }

    @Test
    void checkBillingAccess_allowsActiveOwner() {
        Restaurant restaurant = restaurantForOwner(42L);
        UserAccount owner = ownerWithStatus(SubscriptionStatus.ACTIVE);
        mockOwnerLookup(restaurant.getId(), owner);

        billingService.checkBillingAccess(restaurant);
    }

    @Test
    void checkBillingAccess_expiredOwnerTrialCancelsAndBlocks() {
        Restaurant restaurant = restaurantForOwner(42L);
        UserAccount owner = ownerWithStatus(SubscriptionStatus.TRIALING);
        owner.setTrialEndsAt(Instant.now().minus(2, ChronoUnit.HOURS));
        mockOwnerLookup(restaurant.getId(), owner);

        assertThatThrownBy(() -> billingService.checkBillingAccess(restaurant))
                .isInstanceOf(BillingAccessBlockedException.class);
        assertThat(owner.getBillingStatus()).isEqualTo(SubscriptionStatus.CANCELED);
        verify(userAccountRepository).save(owner);
    }

    @Test
    void getBillingStatus_returnsOwnerScopedFields() {
        Restaurant restaurant = restaurantForOwner(42L);
        UserAccount owner = ownerWithStatus(SubscriptionStatus.PAST_DUE);
        owner.setPastDueSince(Instant.now().minus(1, ChronoUnit.DAYS));
        owner.setTrialEndsAt(Instant.now().plus(4, ChronoUnit.DAYS));
        owner.setStripeCustomerId("cus_owner");
        owner.setStripeSubscriptionId("sub_owner");
        mockOwnerLookup(restaurant.getId(), owner);

        BillingStatusResponse response = billingService.getBillingStatus(restaurant);

        assertThat(response.status()).isEqualTo(SubscriptionStatus.PAST_DUE);
        assertThat(response.trialEndsAt()).isEqualTo(owner.getTrialEndsAt());
        assertThat(response.stripeCustomerId()).isEqualTo("cus_owner");
        assertThat(response.stripeSubscriptionId()).isEqualTo("sub_owner");
        assertThat(response.accessAllowed()).isTrue();
    }

    @Test
    void createCheckoutSession_usesOwnerQuantity() throws Exception {
        Restaurant restaurant = restaurantForOwner(42L);
        UserAccount owner = spy(ownerWithStatus(SubscriptionStatus.TRIALING));
        doReturn(42L).when(owner).getId();
        owner.setStripeCustomerId("cus_owner");
        mockOwnerLookup(restaurant.getId(), owner);
        when(userRestaurantRepository.countByUser_IdAndRoleAndRestaurant_Status(
                42L, RestaurantRole.OWNER, RestaurantStatus.ACTIVE))
                .thenReturn(3L);

        com.stripe.model.checkout.Session session = mock(com.stripe.model.checkout.Session.class);
        when(session.getId()).thenReturn("cs_123");
        when(session.getUrl()).thenReturn("https://stripe.example/checkout");
        when(stripeService.createCheckoutSession(eq("cus_owner"), eq(3L), any()))
                .thenReturn(session);

        String url = billingService.createCheckoutSession(restaurant);

        assertThat(url).isEqualTo("https://stripe.example/checkout");
    }

    @Test
    void createCheckoutSession_rejectsWhenOwnerAlreadySubscribed() throws Exception {
        Restaurant restaurant = restaurantForOwner(42L);
        UserAccount owner = spy(ownerWithStatus(SubscriptionStatus.ACTIVE));
        owner.setStripeCustomerId("cus_owner");
        owner.setStripeSubscriptionId("sub_owner");
        mockOwnerLookup(restaurant.getId(), owner);

        com.stripe.model.Subscription existing = mock(com.stripe.model.Subscription.class);
        com.stripe.model.SubscriptionItemCollection items = mock(com.stripe.model.SubscriptionItemCollection.class);
        com.stripe.model.SubscriptionItem item = mock(com.stripe.model.SubscriptionItem.class);
        when(existing.getId()).thenReturn("sub_owner");
        when(existing.getStatus()).thenReturn("active");
        when(existing.getItems()).thenReturn(items);
        when(items.getData()).thenReturn(List.of(item));
        when(item.getQuantity()).thenReturn(1L);
        when(stripeService.retrieveSubscription("sub_owner")).thenReturn(existing);

        assertThatThrownBy(() -> billingService.createCheckoutSession(restaurant))
                .isInstanceOf(com.mesaro.common.exception.ConflictException.class);

        verify(stripeService, never()).createCheckoutSession(any(), anyLong(), any());
    }

    @Test
    void updateSubscriptionQuantity_updatesStripeAndOwnerQuota() throws Exception {
        Restaurant restaurant = restaurantForOwner(42L);
        UserAccount owner = spy(ownerWithStatus(SubscriptionStatus.ACTIVE));
        doReturn(42L).when(owner).getId();
        owner.setStripeSubscriptionId("sub_owner");
        mockOwnerLookup(restaurant.getId(), owner);
        when(userRestaurantRepository.countByUser_IdAndRoleAndRestaurant_Status(
                42L, RestaurantRole.OWNER, RestaurantStatus.ACTIVE))
                .thenReturn(2L);

        com.stripe.model.Subscription updated = mock(com.stripe.model.Subscription.class);
        com.stripe.model.SubscriptionItemCollection items = mock(com.stripe.model.SubscriptionItemCollection.class);
        com.stripe.model.SubscriptionItem item = mock(com.stripe.model.SubscriptionItem.class);
        when(updated.getId()).thenReturn("sub_owner");
        when(updated.getStatus()).thenReturn("active");
        when(updated.getItems()).thenReturn(items);
        when(items.getData()).thenReturn(List.of(item));
        when(item.getQuantity()).thenReturn(3L);
        when(stripeService.updateSubscriptionQuantity("sub_owner", 3)).thenReturn(updated);

        BillingStatusResponse response = billingService.updateSubscriptionQuantity(restaurant, 3);

        assertThat(owner.getMaxRestaurants()).isEqualTo(3);
        assertThat(response.currentQuantity()).isEqualTo(3);
        assertThat(response.activeRestaurantCount()).isEqualTo(2);
    }

    @Test
    void updateSubscriptionQuantity_rejectsDowngradeBelowActiveRestaurants() throws Exception {
        Restaurant restaurant = restaurantForOwner(42L);
        UserAccount owner = spy(ownerWithStatus(SubscriptionStatus.ACTIVE));
        doReturn(42L).when(owner).getId();
        owner.setStripeSubscriptionId("sub_owner");
        mockOwnerLookup(restaurant.getId(), owner);
        when(userRestaurantRepository.countByUser_IdAndRoleAndRestaurant_Status(
                42L, RestaurantRole.OWNER, RestaurantStatus.ACTIVE))
                .thenReturn(3L);

        assertThatThrownBy(() -> billingService.updateSubscriptionQuantity(restaurant, 2))
                .isInstanceOf(com.mesaro.common.exception.ConflictException.class);

        verify(stripeService, never()).updateSubscriptionQuantity(any(), anyInt());
    }

    @Test
    void handleCheckoutSessionCompleted_setsOwnerActiveAndSyncsQuota() throws Exception {
        UserAccount owner = ownerWithStatus(SubscriptionStatus.TRIALING);
        owner.setStripeCustomerId("cus_owner");
        owner.setMaxRestaurants(1);
        when(userAccountRepository.findByStripeCustomerId("cus_owner")).thenReturn(Optional.of(owner));

        com.stripe.model.Subscription snapshot = mock(com.stripe.model.Subscription.class);
        com.stripe.model.SubscriptionItemCollection items = mock(com.stripe.model.SubscriptionItemCollection.class);
        com.stripe.model.SubscriptionItem item = mock(com.stripe.model.SubscriptionItem.class);
        when(stripeService.retrieveSubscription("sub_owner")).thenReturn(snapshot);
        when(snapshot.getStatus()).thenReturn("active");
        when(snapshot.getItems()).thenReturn(items);
        when(items.getData()).thenReturn(List.of(item));
        when(item.getQuantity()).thenReturn(4L);

        com.stripe.model.checkout.Session session = mock(com.stripe.model.checkout.Session.class);
        when(session.getCustomer()).thenReturn("cus_owner");
        when(session.getSubscription()).thenReturn("sub_owner");

        billingService.handleCheckoutSessionCompleted(session);

        assertThat(owner.getBillingStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(owner.getStripeSubscriptionId()).isEqualTo("sub_owner");
        assertThat(owner.getMaxRestaurants()).isEqualTo(4);
    }

    @Test
    void handleSubscriptionUpdated_syncsOwnerQuotaFromStripeQuantity() throws Exception {
        UserAccount owner = ownerWithStatus(SubscriptionStatus.ACTIVE);
        owner.setStripeCustomerId("cus_owner");
        owner.setMaxRestaurants(1);
        when(userAccountRepository.findByStripeCustomerId("cus_owner")).thenReturn(Optional.of(owner));

        com.stripe.model.Subscription eventSubscription = mock(com.stripe.model.Subscription.class);
        when(eventSubscription.getCustomer()).thenReturn("cus_owner");
        when(eventSubscription.getStatus()).thenReturn("active");
        when(eventSubscription.getId()).thenReturn("sub_owner");

        com.stripe.model.Subscription snapshot = mock(com.stripe.model.Subscription.class);
        com.stripe.model.SubscriptionItemCollection items = mock(com.stripe.model.SubscriptionItemCollection.class);
        com.stripe.model.SubscriptionItem item = mock(com.stripe.model.SubscriptionItem.class);
        when(stripeService.retrieveSubscription("sub_owner")).thenReturn(snapshot);
        when(snapshot.getStatus()).thenReturn("active");
        when(snapshot.getItems()).thenReturn(items);
        when(items.getData()).thenReturn(List.of(item));
        when(item.getQuantity()).thenReturn(2L);

        billingService.handleSubscriptionUpdated(eventSubscription);

        assertThat(owner.getBillingStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(owner.getMaxRestaurants()).isEqualTo(2);
    }

    @Test
    void handleSubscriptionDeleted_resetsOwnerQuotaToBase() {
        UserAccount owner = ownerWithStatus(SubscriptionStatus.ACTIVE);
        owner.setStripeCustomerId("cus_owner");
        owner.setStripeSubscriptionId("sub_owner");
        owner.setMaxRestaurants(5);
        when(userAccountRepository.findByStripeCustomerId("cus_owner")).thenReturn(Optional.of(owner));

        com.stripe.model.Subscription subscription = mock(com.stripe.model.Subscription.class);
        when(subscription.getCustomer()).thenReturn("cus_owner");

        billingService.handleSubscriptionDeleted(subscription);

        assertThat(owner.getBillingStatus()).isEqualTo(SubscriptionStatus.CANCELED);
        assertThat(owner.getStripeSubscriptionId()).isNull();
        assertThat(owner.getMaxRestaurants()).isEqualTo(1);
    }

    @Test
    void handleInvoicePaymentFailed_setsOwnerPastDue() {
        UserAccount owner = ownerWithStatus(SubscriptionStatus.ACTIVE);
        owner.setStripeCustomerId("cus_owner");
        when(userAccountRepository.findByStripeCustomerId("cus_owner")).thenReturn(Optional.of(owner));

        com.stripe.model.Invoice invoice = mock(com.stripe.model.Invoice.class);
        when(invoice.getCustomer()).thenReturn("cus_owner");

        billingService.handleInvoicePaymentFailed(invoice);

        assertThat(owner.getBillingStatus()).isEqualTo(SubscriptionStatus.PAST_DUE);
        assertThat(owner.getPastDueSince()).isNotNull();
    }

    @Test
    void handleInvoicePaymentFailed_preservesPastDueSinceOnRepeatFailure() {
        Instant firstFailure = Instant.now().minus(3, ChronoUnit.DAYS);
        UserAccount owner = ownerWithStatus(SubscriptionStatus.PAST_DUE);
        owner.setStripeCustomerId("cus_owner");
        owner.setPastDueSince(firstFailure);
        when(userAccountRepository.findByStripeCustomerId("cus_owner")).thenReturn(Optional.of(owner));

        com.stripe.model.Invoice invoice = mock(com.stripe.model.Invoice.class);
        when(invoice.getCustomer()).thenReturn("cus_owner");

        billingService.handleInvoicePaymentFailed(invoice);

        assertThat(owner.getPastDueSince()).isEqualTo(firstFailure);
    }

    @Test
    void checkBillingAccess_allowsPastDueWithinGrace() {
        Restaurant restaurant = restaurantForOwner(42L);
        UserAccount owner = ownerWithStatus(SubscriptionStatus.PAST_DUE);
        owner.setPastDueSince(Instant.now().minus(6, ChronoUnit.DAYS));
        mockOwnerLookup(restaurant.getId(), owner);

        billingService.checkBillingAccess(restaurant);
    }

    @Test
    void checkBillingAccess_blocksPastDueAfterGrace() {
        Restaurant restaurant = restaurantForOwner(42L);
        UserAccount owner = ownerWithStatus(SubscriptionStatus.PAST_DUE);
        owner.setPastDueSince(Instant.now().minus(8, ChronoUnit.DAYS));
        mockOwnerLookup(restaurant.getId(), owner);

        assertThatThrownBy(() -> billingService.checkBillingAccess(restaurant))
                .isInstanceOf(BillingAccessBlockedException.class);
    }

    @Test
    void getBillingStatus_accessBlockedWhenPastDueGraceExpired() {
        Restaurant restaurant = restaurantForOwner(42L);
        UserAccount owner = ownerWithStatus(SubscriptionStatus.PAST_DUE);
        owner.setPastDueSince(Instant.now().minus(8, ChronoUnit.DAYS));
        mockOwnerLookup(restaurant.getId(), owner);

        BillingStatusResponse response = billingService.getBillingStatus(restaurant);

        assertThat(response.accessAllowed()).isFalse();
    }

    @Test
    void handleInvoicePaymentSucceeded_restoresActiveFromPastDue() {
        UserAccount owner = ownerWithStatus(SubscriptionStatus.PAST_DUE);
        owner.setStripeCustomerId("cus_owner");
        when(userAccountRepository.findByStripeCustomerId("cus_owner")).thenReturn(Optional.of(owner));

        com.stripe.model.Invoice invoice = mock(com.stripe.model.Invoice.class);
        when(invoice.getCustomer()).thenReturn("cus_owner");
        when(invoice.getBillingReason()).thenReturn("subscription_cycle");

        billingService.handleInvoicePaymentSucceeded(invoice);

        assertThat(owner.getBillingStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(owner.getPastDueSince()).isNull();
    }

    @Test
    void tryClaimEvent_firstCallReturnsTrue() {
        when(jdbcTemplate.update(anyString(), eq("evt_123"), eq("checkout.session.completed"))).thenReturn(1);

        assertThat(billingService.tryClaimEvent("evt_123", "checkout.session.completed")).isTrue();
    }

    @Test
    void tryClaimEvent_alreadyDone_returnsFalse() {
        when(jdbcTemplate.update(anyString(), eq("evt_123"), eq("checkout.session.completed"))).thenReturn(0);
        when(jdbcTemplate.update(anyString(), eq("checkout.session.completed"), eq("evt_123"))).thenReturn(0);

        assertThat(billingService.tryClaimEvent("evt_123", "checkout.session.completed")).isFalse();
    }

    @Test
    void tryClaimEvent_reclaimsFailed() {
        when(jdbcTemplate.update(anyString(), eq("evt_123"), eq("checkout.session.completed"))).thenReturn(0);
        when(jdbcTemplate.update(anyString(), eq("checkout.session.completed"), eq("evt_123"))).thenReturn(1);

        assertThat(billingService.tryClaimEvent("evt_123", "checkout.session.completed")).isTrue();
    }

    @Test
    void markEventDone_updatesStatus() {
        billingService.markEventDone("evt_123");
        verify(jdbcTemplate).update(anyString(), eq("evt_123"));
    }

    @Test
    void markEventFailed_updatesStatus() {
        billingService.markEventFailed("evt_123");
        verify(jdbcTemplate).update(anyString(), eq("evt_123"));
    }

    private void mockOwnerLookup(Long restaurantId, UserAccount owner) {
        UserRestaurant ownerAssignment = mock(UserRestaurant.class);
        when(ownerAssignment.getUser()).thenReturn(owner);
        when(userRestaurantRepository.findByRestaurantIdAndRoleWithUser(restaurantId, RestaurantRole.OWNER))
                .thenReturn(List.of(ownerAssignment));
    }

    private Restaurant restaurantForOwner(Long ownerId) {
        Restaurant restaurant = spy(new Restaurant("Test Restaurant", "test-restaurant-" + ownerId, "Europe/Brussels"));
        doReturn(ownerId).when(restaurant).getId();
        return restaurant;
    }

    private UserAccount ownerWithStatus(SubscriptionStatus status) {
        UserAccount owner = new UserAccount("owner@example.com", "hash");
        owner.setBillingStatus(status);
        owner.setTrialEndsAt(Instant.now().plus(14, ChronoUnit.DAYS));
        owner.setMaxRestaurants(1);
        return owner;
    }
}
