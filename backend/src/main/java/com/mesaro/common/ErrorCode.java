package com.mesaro.common;

public final class ErrorCode {
    public static final String VALIDATION_ERROR = "VALIDATION_ERROR";
    public static final String NOT_FOUND = "NOT_FOUND";
    public static final String CONFLICT = "CONFLICT";
    public static final String UNAUTHORIZED = "UNAUTHORIZED";
    public static final String FORBIDDEN = "FORBIDDEN";
    public static final String RATE_LIMITED = "RATE_LIMITED";
    public static final String HOLD_EXPIRED = "HOLD_EXPIRED";
    public static final String HOLD_INVALID = "HOLD_INVALID";
    public static final String RESTAURANT_CLOSED = "RESTAURANT_CLOSED";
    public static final String CAPACITY_EXCEEDED = "CAPACITY_EXCEEDED";
    public static final String BILLING_LIMIT_EXCEEDED = "BILLING_LIMIT_EXCEEDED";
    public static final String BILLING_ACCESS_BLOCKED = "BILLING_ACCESS_BLOCKED";
    public static final String INTERNAL_ERROR = "INTERNAL_ERROR";

    private ErrorCode() {
    }
}
