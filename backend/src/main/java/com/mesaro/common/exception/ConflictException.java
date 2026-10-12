package com.mesaro.common.exception;

import com.mesaro.common.ErrorCode;
import org.springframework.http.HttpStatus;

public class ConflictException extends ApiException {

    public ConflictException(String message) {
        super(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT);
    }

    public ConflictException(String message, String field) {
        super(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT, field);
    }
}
