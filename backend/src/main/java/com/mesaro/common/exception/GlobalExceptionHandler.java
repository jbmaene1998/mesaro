package com.mesaro.common.exception;

import com.mesaro.common.ApiResponse;
import com.mesaro.common.ErrorCode;
import com.mesaro.infra.LogSanitizer;
import jakarta.validation.ConstraintViolationException;
import java.sql.SQLException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.persistence.OptimisticLockException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String CONSTRAINT_CONFLICT_MESSAGE =
            "This change conflicts with existing data. Refresh and try again.";

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException ex) {
        log.warn("API exception: code={} field={} status={}",
                ex.getCode(), ex.getField(), ex.getStatus().value());
        return ResponseEntity
                .status(ex.getStatus())
                .body(ApiResponse.error(ex.getCode(), ex.getMessage(), ex.getField()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException ex) {
        var fieldError = ex.getBindingResult().getFieldError();
        String message = fieldError != null ? fieldError.getDefaultMessage() : "Validation failed";
        String field = fieldError != null ? fieldError.getField() : null;
        log.warn("Validation error: {} - {}", field, message);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ErrorCode.VALIDATION_ERROR, message, field));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException ex) {
        if (ex.getConstraintViolations().isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(ErrorCode.VALIDATION_ERROR, "Validation failed"));
        }
        var violation = ex.getConstraintViolations().iterator().next();
        String message = violation.getMessage();
        String field = extractLeafField(violation.getPropertyPath().toString());
        log.warn("Constraint violation: {} - {}", field, message);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ErrorCode.VALIDATION_ERROR, message, field));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingParameter(MissingServletRequestParameterException ex) {
        log.warn("Missing parameter: {}", ex.getParameterName());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ErrorCode.VALIDATION_ERROR, "Required parameter missing: " + ex.getParameterName(), ex.getParameterName()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        log.warn("Type mismatch for parameter: {}", ex.getName());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ErrorCode.VALIDATION_ERROR, "Invalid value for parameter: " + ex.getName(), ex.getName()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleMessageNotReadable(HttpMessageNotReadableException ex) {
        log.warn("Message not readable: {}", LogSanitizer.exceptionType(ex));
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ErrorCode.VALIDATION_ERROR, "Invalid request body"));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        log.warn("Method not supported: {}", ex.getMethod());
        return ResponseEntity
                .status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiResponse.error(ErrorCode.VALIDATION_ERROR, "Method not allowed: " + ex.getMethod()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(NoResourceFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ErrorCode.NOT_FOUND, "Resource not found"));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationException(AuthenticationException ex) {
        log.warn("Authentication failed: {}", LogSanitizer.exceptionType(ex));
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(ErrorCode.UNAUTHORIZED, "Authentication required"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", LogSanitizer.exceptionType(ex));
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(ErrorCode.FORBIDDEN, "Access denied"));
    }

    @ExceptionHandler({ObjectOptimisticLockingFailureException.class, OptimisticLockException.class})
    public ResponseEntity<ApiResponse<Void>> handleOptimisticLocking(Exception ex) {
        log.warn("Concurrent modification detected: {}", LogSanitizer.exceptionType(ex));
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ErrorCode.CONFLICT,
                        "Resource was modified by another request. Re-fetch the resource and retry with the latest ETag."));
    }

    @ExceptionHandler(CannotAcquireLockException.class)
    public ResponseEntity<ApiResponse<Void>> handleLockAcquisition(CannotAcquireLockException ex) {
        log.warn("Could not acquire database lock: {}", LogSanitizer.exceptionType(ex));
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ErrorCode.CONFLICT, CONSTRAINT_CONFLICT_MESSAGE));
    }

    @ExceptionHandler({DataIntegrityViolationException.class, org.hibernate.exception.ConstraintViolationException.class})
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(Exception ex) {
        log.warn("Data integrity violation: {}", extractDatabaseConstraintMessage(ex));
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ErrorCode.CONFLICT, CONSTRAINT_CONFLICT_MESSAGE));
    }

    @ExceptionHandler(SQLException.class)
    public ResponseEntity<ApiResponse<Void>> handleSqlException(SQLException ex) {
        log.warn("SQL constraint violation: {}", extractDatabaseConstraintMessage(ex));
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ErrorCode.CONFLICT, CONSTRAINT_CONFLICT_MESSAGE));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        log.error("Unexpected error", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(ErrorCode.INTERNAL_ERROR, "An unexpected error occurred"));
    }

    private String extractLeafField(String path) {
        if (path == null || path.isBlank()) {
            return path;
        }
        String normalized = path.trim();
        int dot = normalized.lastIndexOf('.');
        if (dot >= 0 && dot < normalized.length() - 1) {
            normalized = normalized.substring(dot + 1);
        }
        int bracket = normalized.lastIndexOf(']');
        if (bracket >= 0 && bracket < normalized.length() - 1) {
            normalized = normalized.substring(bracket + 1);
        }
        return normalized;
    }

    private String extractDatabaseConstraintMessage(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if ("org.postgresql.util.PSQLException".equals(current.getClass().getName())) {
                String postgresDetail = extractPostgresServerMessage(current);
                if (postgresDetail != null && !postgresDetail.isBlank()) {
                    return postgresDetail;
                }
            }
            if (current instanceof SQLException sqlEx && sqlEx.getMessage() != null && !sqlEx.getMessage().isBlank()) {
                return sqlEx.getMessage();
            }
            current = current.getCause();
        }
        return "Database constraint violation";
    }

    private String extractPostgresServerMessage(Throwable throwable) {
        try {
            Object serverError = throwable.getClass().getMethod("getServerErrorMessage").invoke(throwable);
            if (serverError != null) {
                Object message = serverError.getClass().getMethod("getMessage").invoke(serverError);
                if (message instanceof String text) {
                    return text;
                }
            }
        } catch (ReflectiveOperationException ignored) {
            // Fallback to generic SQLException message if PostgreSQL details are unavailable.
        }
        return null;
    }
}
