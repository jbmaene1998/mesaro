package com.mesaro.reservation;

public enum ReservationStatus {
    CONFIRMED,
    SEATED,
    COMPLETED,
    NO_SHOW,
    CANCELLED;

    public boolean isActive() {
        return this == CONFIRMED || this == SEATED;
    }

    public boolean isTerminal() {
        return this == COMPLETED || this == NO_SHOW || this == CANCELLED;
    }
}
