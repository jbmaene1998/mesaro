package com.mesaro.common.exception;

import com.mesaro.common.ErrorCode;
import org.springframework.http.HttpStatus;

public class PreconditionFailedException extends ApiException {

    public PreconditionFailedException(String message) {
        super(ErrorCode.CONFLICT, message, HttpStatus.PRECONDITION_FAILED);
    }

    public PreconditionFailedException(String message, String field) {
        super(ErrorCode.CONFLICT, message, HttpStatus.PRECONDITION_FAILED, field);
    }
}
