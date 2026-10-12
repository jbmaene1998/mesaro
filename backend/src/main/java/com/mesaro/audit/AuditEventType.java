package com.mesaro.audit;

public final class AuditEventType {
    // Authentication events
    public static final String LOGIN_SUCCESS = "LOGIN_SUCCESS";
    public static final String LOGIN_FAILURE = "LOGIN_FAILURE";
    public static final String LOGOUT = "LOGOUT";
    public static final String PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED";
    public static final String PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED";
    public static final String PASSWORD_CHANGED = "PASSWORD_CHANGED";
    public static final String TOKEN_REFRESHED = "TOKEN_REFRESHED";
    public static final String TOKEN_REFRESH_FAILED = "TOKEN_REFRESH_FAILED";
    public static final String CONTACT_FORM_SUBMITTED = "CONTACT_FORM_SUBMITTED";

    // Reservation events
    public static final String RESERVATION_CREATED = "RESERVATION_CREATED";
    public static final String RESERVATION_CANCELLED = "RESERVATION_CANCELLED";
    public static final String RESERVATION_SEATED = "RESERVATION_SEATED";
    public static final String RESERVATION_COMPLETED = "RESERVATION_COMPLETED";
    public static final String RESERVATION_NO_SHOW = "RESERVATION_NO_SHOW";
    public static final String RESERVATION_TABLE_SWITCHED = "RESERVATION_TABLE_SWITCHED";
    public static final String RESERVATION_UPDATED = "RESERVATION_UPDATED";

    // Hold events
    public static final String HOLD_CREATED = "HOLD_CREATED";
    public static final String HOLD_CONFIRMED = "HOLD_CONFIRMED";
    public static final String HOLD_EXPIRED = "HOLD_EXPIRED";

    // Staff events
    public static final String STAFF_INVITED = "STAFF_INVITED";
    public static final String STAFF_INVITE_ACCEPTED = "STAFF_INVITE_ACCEPTED";
    public static final String STAFF_ROLE_CHANGED = "STAFF_ROLE_CHANGED";
    public static final String STAFF_REMOVED = "STAFF_REMOVED";

    // Vacation events
    public static final String VACATION_CREATED = "VACATION_CREATED";
    public static final String VACATION_APPROVED = "VACATION_APPROVED";
    public static final String VACATION_REJECTED = "VACATION_REJECTED";
    public static final String VACATION_CANCELLED = "VACATION_CANCELLED";

    // Staff planning events
    public static final String STAFF_SHIFT_PLANNED = "STAFF_SHIFT_PLANNED";
    public static final String STAFF_SHIFT_UNPLANNED = "STAFF_SHIFT_UNPLANNED";
    public static final String STAFF_WEEKLY_HOURS_SET = "STAFF_WEEKLY_HOURS_SET";
    public static final String OPENING_HOURS_UPDATED = "OPENING_HOURS_UPDATED";

    private AuditEventType() {
    }
}
