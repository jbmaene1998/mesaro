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
@Table(name = "email_verification")
public class EmailVerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at_utc", nullable = false)
    private Instant expiresAtUtc;

    @Column(name = "used_at_utc")
    private Instant usedAtUtc;

    @Column(name = "created_at_utc", nullable = false, updatable = false)
    private Instant createdAtUtc;

    protected EmailVerificationToken() {
    }

    public EmailVerificationToken(UserAccount user, String tokenHash, Instant expiresAtUtc) {
        this.user = user;
        this.tokenHash = tokenHash;
        this.expiresAtUtc = expiresAtUtc;
    }

    @PrePersist
    void prePersist() {
        if (createdAtUtc == null) {
            createdAtUtc = Instant.now();
        }
    }

    public UserAccount getUser() {
        return user;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Instant getExpiresAtUtc() {
        return expiresAtUtc;
    }

    public Instant getUsedAtUtc() {
        return usedAtUtc;
    }

    public void markUsed(Instant when) {
        this.usedAtUtc = when;
    }
}
