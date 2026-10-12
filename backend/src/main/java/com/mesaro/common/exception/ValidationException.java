package com.mesaro.common.exception;

import com.mesaro.common.ErrorCode;
import org.springframework.http.HttpStatus;

public class ValidationException extends ApiException {

    public ValidationException(String message) {
        super(ErrorCode.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST);
    }

    public ValidationException(String message, String field) {
        super(ErrorCode.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST, field);
    }
}
