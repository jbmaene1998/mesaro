package com.mesaro.audit;

public final class AuditEventType {
    // Authentication / account events
    public static final String LOGIN_SUCCESS = "LOGIN_SUCCESS";
    public static final String LOGIN_FAILURE = "LOGIN_FAILURE";
    public static final String LOGOUT = "LOGOUT";
    public static final String PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED";
    public static final String PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED";
    public static final String PASSWORD_CHANGED = "PASSWORD_CHANGED";
    public static final String TOKEN_REFRESHED = "TOKEN_REFRESHED";
    public static final String TOKEN_REFRESH_FAILED = "TOKEN_REFRESH_FAILED";
    public static final String CONTACT_FORM_SUBMITTED = "CONTACT_FORM_SUBMITTED";
    public static final String USER_REGISTERED = "USER_REGISTERED";
    public static final String USER_UPDATED = "USER_UPDATED";
    public static final String USER_DELETED = "USER_DELETED";

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
    public static final String STAFF_INVITE_RESENT = "STAFF_INVITE_RESENT";
    public static final String STAFF_INVITE_ROLE_UPDATED = "STAFF_INVITE_ROLE_UPDATED";
    public static final String STAFF_INVITE_REVOKED = "STAFF_INVITE_REVOKED";

    // Vacation events
    public static final String VACATION_CREATED = "VACATION_CREATED";
    public static final String VACATION_APPROVED = "VACATION_APPROVED";
    public static final String VACATION_REJECTED = "VACATION_REJECTED";
    public static final String VACATION_CANCELLED = "VACATION_CANCELLED";
    public static final String VACATION_UPDATED = "VACATION_UPDATED";
    public static final String VACATION_DELETED = "VACATION_DELETED";

    // Staff planning events
    public static final String STAFF_SHIFT_PLANNED = "STAFF_SHIFT_PLANNED";
    public static final String STAFF_SHIFT_UNPLANNED = "STAFF_SHIFT_UNPLANNED";
    public static final String STAFF_WEEKLY_HOURS_SET = "STAFF_WEEKLY_HOURS_SET";

    // Restaurant events
    public static final String RESTAURANT_CREATED = "RESTAURANT_CREATED";
    public static final String RESTAURANT_UPDATED = "RESTAURANT_UPDATED";
    public static final String RESTAURANT_BOOKING_ENABLED = "RESTAURANT_BOOKING_ENABLED";
    public static final String RESTAURANT_BOOKING_DISABLED = "RESTAURANT_BOOKING_DISABLED";
    public static final String RESTAURANT_ARCHIVED = "RESTAURANT_ARCHIVED";
    public static final String RESTAURANT_DELETED = "RESTAURANT_DELETED";
    public static final String RESTAURANT_HARD_DELETED = "RESTAURANT_HARD_DELETED";

    // Table / combination events
    public static final String TABLE_CREATED = "TABLE_CREATED";
    public static final String TABLE_UPDATED = "TABLE_UPDATED";
    public static final String TABLE_DELETED = "TABLE_DELETED";
    public static final String TABLE_COMBINATION_CREATED = "TABLE_COMBINATION_CREATED";
    public static final String TABLE_COMBINATION_UPDATED = "TABLE_COMBINATION_UPDATED";
    public static final String TABLE_COMBINATION_DELETED = "TABLE_COMBINATION_DELETED";

    // Shift events
    public static final String SHIFT_CREATED = "SHIFT_CREATED";
    public static final String SHIFT_UPDATED = "SHIFT_UPDATED";
    public static final String SHIFT_ACTIVATED = "SHIFT_ACTIVATED";
    public static final String SHIFT_DEACTIVATED = "SHIFT_DEACTIVATED";
    public static final String SHIFT_DELETED = "SHIFT_DELETED";

    // Billing events
    public static final String BILLING_CHECKOUT_STARTED = "BILLING_CHECKOUT_STARTED";
    public static final String BILLING_SUBSCRIPTION_UPDATED = "BILLING_SUBSCRIPTION_UPDATED";
    public static final String BILLING_SUBSCRIPTION_DELETED = "BILLING_SUBSCRIPTION_DELETED";
    public static final String BILLING_INVOICE_PAID = "BILLING_INVOICE_PAID";
    public static final String BILLING_INVOICE_FAILED = "BILLING_INVOICE_FAILED";
    public static final String BILLING_TRIAL_EXPIRED = "BILLING_TRIAL_EXPIRED";

    // GDPR events
    public static final String GDPR_RETENTION_ENFORCED = "GDPR_RETENTION_ENFORCED";
    public static final String GDPR_ENTITY_PURGED = "GDPR_ENTITY_PURGED";

    private AuditEventType() {
    }
}
