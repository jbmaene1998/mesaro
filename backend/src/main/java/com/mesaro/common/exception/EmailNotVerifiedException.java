package com.mesaro.common.exception;

import com.mesaro.common.ErrorCode;
import org.springframework.http.HttpStatus;

public class EmailNotVerifiedException extends ApiException {

    public EmailNotVerifiedException() {
        super(ErrorCode.EMAIL_NOT_VERIFIED,
                "Verify your email before signing in",
                HttpStatus.FORBIDDEN);
    }
}
