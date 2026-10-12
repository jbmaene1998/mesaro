package com.mesaro.email;

/**
 * Exception thrown when email sending fails.
 * This is an unchecked exception to allow callers to decide whether to handle it.
 */
public class EmailSendException extends RuntimeException {

    public EmailSendException(String message) {
        super(message);
    }

    public EmailSendException(String message, Throwable cause) {
        super(message, cause);
    }
}
