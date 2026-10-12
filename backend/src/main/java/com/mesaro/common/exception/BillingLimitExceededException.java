package com.mesaro.common.exception;

import org.springframework.http.HttpStatus;

public class BillingLimitExceededException extends ApiException {
    public BillingLimitExceededException(String message) {
        super("BILLING_LIMIT_EXCEEDED", message, HttpStatus.CONFLICT);
    }
}
