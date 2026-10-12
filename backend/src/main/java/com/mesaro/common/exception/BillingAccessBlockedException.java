package com.mesaro.common.exception;

import com.mesaro.common.ErrorCode;
import org.springframework.http.HttpStatus;

public class BillingAccessBlockedException extends ApiException {
    public BillingAccessBlockedException(String message, String reason) {
        super(ErrorCode.BILLING_ACCESS_BLOCKED, message, HttpStatus.PAYMENT_REQUIRED, reason);
    }
}
