package com.mesaro.user;

import com.mesaro.billing.SubscriptionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "user_account")
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "full_name", length = 120)
    private String fullName;

    @Column(length = 30)
    private String phone;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(nullable = false)
    private boolean enabled = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserAccountStatus status = UserAccountStatus.ACTIVE;

    @Column(name = "max_restaurants", nullable = false)
    private int maxRestaurants = 1;

    @Column(name = "stripe_customer_id", length = 100, unique = true)
    private String stripeCustomerId;

    @Column(name = "stripe_subscription_id", length = 100, unique = true)
    private String stripeSubscriptionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_status", nullable = false, length = 30)
    private SubscriptionStatus billingStatus = SubscriptionStatus.TRIALING;

    @Column(name = "trial_ends_at")
    private Instant trialEndsAt;

    @Column(name = "deleted_at_utc")
    private Instant deletedAtUtc;

    @Column(name = "created_at_utc", nullable = false, updatable = false)
    private Instant createdAtUtc;

    protected UserAccount() {
    }

    public UserAccount(String email, String passwordHash) {
        this.email = email;
        this.passwordHash = passwordHash;
    }

    @PrePersist
    void prePersist() {
        if (createdAtUtc == null) {
            this.createdAtUtc = Instant.now();
        }
        if (trialEndsAt == null) {
            this.trialEndsAt = Instant.now().plus(14, java.time.temporal.ChronoUnit.DAYS);
        }
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public UserAccountStatus getStatus() {
        return status;
    }

    public void setStatus(UserAccountStatus status) {
        this.status = status;
    }

    public Instant getDeletedAtUtc() {
        return deletedAtUtc;
    }

    public void setDeletedAtUtc(Instant deletedAtUtc) {
        this.deletedAtUtc = deletedAtUtc;
    }

    public Instant getCreatedAtUtc() {
        return createdAtUtc;
    }

    public int getMaxRestaurants() {
        return maxRestaurants;
    }

    public void setMaxRestaurants(int maxRestaurants) {
        this.maxRestaurants = maxRestaurants;
    }

    public String getStripeCustomerId() {
        return stripeCustomerId;
    }

    public void setStripeCustomerId(String stripeCustomerId) {
        this.stripeCustomerId = stripeCustomerId;
    }

    public String getStripeSubscriptionId() {
        return stripeSubscriptionId;
    }

    public void setStripeSubscriptionId(String stripeSubscriptionId) {
        this.stripeSubscriptionId = stripeSubscriptionId;
    }

    public SubscriptionStatus getBillingStatus() {
        return billingStatus;
    }

    public void setBillingStatus(SubscriptionStatus billingStatus) {
        this.billingStatus = billingStatus;
    }

    public Instant getTrialEndsAt() {
        return trialEndsAt;
    }

    public void setTrialEndsAt(Instant trialEndsAt) {
        this.trialEndsAt = trialEndsAt;
    }

}
