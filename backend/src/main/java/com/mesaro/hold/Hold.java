package com.mesaro.hold;

import com.mesaro.restaurant.Restaurant;
import com.mesaro.shift.Shift;
import com.mesaro.table.DiningTable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "hold")
public class Hold {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "party_size", nullable = false)
    private int partySize;

    @Column(name = "start_at_utc", nullable = false)
    private Instant startAtUtc;

    @Column(name = "start_local_text", length = 16)
    private String startLocalText;

    @Column(name = "end_at_utc", nullable = false)
    private Instant endAtUtc;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private Shift shift;

    @Column(name = "expires_at_utc", nullable = false)
    private Instant expiresAtUtc;

    @Column(nullable = false)
    private boolean confirmed = false;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "hold_table",
            joinColumns = @JoinColumn(name = "hold_id"),
            inverseJoinColumns = @JoinColumn(name = "table_id")
    )
    private Set<DiningTable> tables = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Hold() {
    }

    public Hold(Restaurant restaurant, String tokenHash, int partySize,
                Instant startAtUtc, Instant endAtUtc, Shift shift, Instant expiresAtUtc) {
        this.restaurant = restaurant;
        this.tokenHash = tokenHash;
        this.partySize = partySize;
        this.startAtUtc = startAtUtc;
        this.endAtUtc = endAtUtc;
        this.shift = shift;
        this.expiresAtUtc = expiresAtUtc;
    }

    @PrePersist
    void prePersist() {
        this.createdAt = Instant.now();
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAtUtc);
    }

    public boolean isActive() {
        return !confirmed && !isExpired();
    }

    public void markConfirmed() {
        this.confirmed = true;
    }

    public void addTable(DiningTable table) {
        this.tables.add(table);
    }

    public void addTables(Set<DiningTable> tables) {
        this.tables.addAll(tables);
    }

    public Long getId() {
        return id;
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public int getPartySize() {
        return partySize;
    }

    public Instant getStartAtUtc() {
        return startAtUtc;
    }

    public Instant getEndAtUtc() {
        return endAtUtc;
    }

    public String getStartLocalText() {
        return startLocalText;
    }

    public void setStartLocalText(String startLocalText) {
        this.startLocalText = startLocalText;
    }

    public Shift getShift() {
        return shift;
    }

    public Instant getExpiresAtUtc() {
        return expiresAtUtc;
    }

    public boolean isConfirmed() {
        return confirmed;
    }

    public Set<DiningTable> getTables() {
        return tables;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
