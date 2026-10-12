package com.mesaro.common.exception;

import com.mesaro.common.ErrorCode;
import org.springframework.http.HttpStatus;

public class NotFoundException extends ApiException {

    public NotFoundException(String message) {
        super(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
    }

    public NotFoundException(String entityName, Object id) {
        super(ErrorCode.NOT_FOUND, entityName + " not found with id: " + id, HttpStatus.NOT_FOUND);
    }
}
