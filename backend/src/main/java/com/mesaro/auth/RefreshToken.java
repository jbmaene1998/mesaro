package com.mesaro.auth;

import com.mesaro.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "refresh_token")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(nullable = false, unique = true, length = 255)
    // Stores the SHA-256 hash of the refresh token (raw token is only returned once to clients).
    private String token;

    @Column(name = "expires_at_utc", nullable = false)
    private Instant expiresAtUtc;

    @Column(nullable = false)
    private boolean revoked = false;

    @Column(name = "created_at_utc", nullable = false, updatable = false)
    private Instant createdAtUtc;

    protected RefreshToken() {
    }

    public RefreshToken(UserAccount user, String token, Instant expiresAtUtc) {
        this.user = user;
        this.token = token;
        this.expiresAtUtc = expiresAtUtc;
    }

    @PrePersist
    void prePersist() {
        if (createdAtUtc == null) {
            createdAtUtc = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public UserAccount getUser() {
        return user;
    }

    public String getToken() {
        return token;
    }

    public Instant getExpiresAtUtc() {
        return expiresAtUtc;
    }

    public boolean isRevoked() {
        return revoked;
    }

    public void setRevoked(boolean revoked) {
        this.revoked = revoked;
    }

    public Instant getCreatedAtUtc() {
        return createdAtUtc;
    }
}
