package com.mesaro.staff;

import com.mesaro.restaurant.Restaurant;
import com.mesaro.security.RestaurantRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "staff_invite")
public class StaffInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(name = "first_name", length = 60)
    private String firstName;

    @Column(name = "last_name", length = 60)
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RestaurantRole role;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at_utc", nullable = false)
    private Instant expiresAtUtc;

    @Column(name = "accepted_at_utc")
    private Instant acceptedAtUtc;

    @Column(name = "revoked_at_utc")
    private Instant revokedAtUtc;

    @Column(name = "invited_by_user_id")
    private Long invitedByUserId;

    @Column(name = "created_at_utc", nullable = false, updatable = false)
    private Instant createdAtUtc;

    protected StaffInvite() {
    }

    public StaffInvite(Restaurant restaurant, String email, String firstName, String lastName, RestaurantRole role,
                       String tokenHash, Instant expiresAtUtc, Long invitedByUserId) {
        this.restaurant = restaurant;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.role = role;
        this.tokenHash = tokenHash;
        this.expiresAtUtc = expiresAtUtc;
        this.invitedByUserId = invitedByUserId;
    }

    @PrePersist
    void prePersist() {
        this.createdAtUtc = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public String getEmail() {
        return email;
    }

    public RestaurantRole getRole() {
        return role;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setRole(RestaurantRole role) {
        this.role = role;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public void setTokenHash(String tokenHash) {
        this.tokenHash = tokenHash;
    }

    public Instant getExpiresAtUtc() {
        return expiresAtUtc;
    }

    public void setExpiresAtUtc(Instant expiresAtUtc) {
        this.expiresAtUtc = expiresAtUtc;
    }

    public Instant getAcceptedAtUtc() {
        return acceptedAtUtc;
    }

    public void markAccepted(Instant when) {
        this.acceptedAtUtc = when;
    }

    public Instant getRevokedAtUtc() {
        return revokedAtUtc;
    }

    public void markRevoked(Instant when) {
        this.revokedAtUtc = when;
    }

    public Long getInvitedByUserId() {
        return invitedByUserId;
    }

    public Instant getCreatedAtUtc() {
        return createdAtUtc;
    }

    public boolean isActive(Instant now) {
        return acceptedAtUtc == null && revokedAtUtc == null && expiresAtUtc.isAfter(now);
    }
}
