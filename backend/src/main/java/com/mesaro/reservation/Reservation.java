package com.mesaro.reservation;

import com.mesaro.restaurant.Restaurant;
import com.mesaro.shift.Shift;
import com.mesaro.table.DiningTable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "reservation")
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private Shift shift;

    @Column(name = "confirmation_code", nullable = false, unique = true, length = 20)
    private String confirmationCode;

    @Column(name = "guest_name", nullable = false, length = 100)
    private String guestName;

    @Column(name = "guest_email", nullable = false, length = 255)
    private String guestEmail;

    @Column(name = "guest_phone", length = 30)
    private String guestPhone;

    @Column(name = "party_size", nullable = false)
    private int partySize;

    @Column(name = "start_at_utc", nullable = false)
    private Instant startAtUtc;

    @Column(name = "start_local_text", length = 16)
    private String startLocalText;

    @Column(name = "end_at_utc", nullable = false)
    private Instant endAtUtc;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReservationStatus status = ReservationStatus.CONFIRMED;

    @Column(name = "cancel_token_hash", length = 64)
    private String cancelTokenHash;

    @Column(name = "cancel_token_expires_at_utc")
    private Instant cancelTokenExpiresAtUtc;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "reservation_table",
            joinColumns = @JoinColumn(name = "reservation_id"),
            inverseJoinColumns = @JoinColumn(name = "table_id")
    )
    private Set<DiningTable> tables = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected Reservation() {
    }

    public Reservation(Restaurant restaurant, Shift shift, String confirmationCode,
                       String guestName, String guestEmail, int partySize,
                       Instant startAtUtc, Instant endAtUtc) {
        this.restaurant = restaurant;
        this.shift = shift;
        this.confirmationCode = confirmationCode;
        this.guestName = guestName;
        this.guestEmail = guestEmail;
        this.partySize = partySize;
        this.startAtUtc = startAtUtc;
        this.endAtUtc = endAtUtc;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public void addTable(DiningTable table) {
        this.tables.add(table);
    }

    public void addTables(Set<DiningTable> tables) {
        this.tables.addAll(tables);
    }

    public boolean isActive() {
        return status.isActive();
    }

    public boolean isCancellable() {
        return status == ReservationStatus.CONFIRMED;
    }

    public void cancel() {
        this.status = ReservationStatus.CANCELLED;
    }

    public void seat() {
        this.status = ReservationStatus.SEATED;
    }

    public void complete() {
        this.status = ReservationStatus.COMPLETED;
    }

    public void markNoShow() {
        this.status = ReservationStatus.NO_SHOW;
    }

    // Getters and setters

    public Long getId() {
        return id;
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public Shift getShift() {
        return shift;
    }

    public String getConfirmationCode() {
        return confirmationCode;
    }

    public void setConfirmationCode(String confirmationCode) {
        this.confirmationCode = confirmationCode;
    }

    public String getGuestName() {
        return guestName;
    }

    public void setGuestName(String guestName) {
        this.guestName = guestName;
    }

    public String getGuestEmail() {
        return guestEmail;
    }

    public void setGuestEmail(String guestEmail) {
        this.guestEmail = guestEmail;
    }

    public String getGuestPhone() {
        return guestPhone;
    }

    public void setGuestPhone(String guestPhone) {
        this.guestPhone = guestPhone;
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

    public ReservationStatus getStatus() {
        return status;
    }

    public String getCancelTokenHash() {
        return cancelTokenHash;
    }

    public void setCancelTokenHash(String cancelTokenHash) {
        this.cancelTokenHash = cancelTokenHash;
    }

    public Instant getCancelTokenExpiresAtUtc() {
        return cancelTokenExpiresAtUtc;
    }

    public void setCancelTokenExpiresAtUtc(Instant cancelTokenExpiresAtUtc) {
        this.cancelTokenExpiresAtUtc = cancelTokenExpiresAtUtc;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Set<DiningTable> getTables() {
        return tables;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public long getVersion() {
        return version;
    }
}
