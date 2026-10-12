package com.mesaro.infra;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Utility methods for safely logging potentially sensitive values.
 */
public final class LogSanitizer {

    private LogSanitizer() {
    }

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "[REDACTED]";
        }
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String domain = parts[1];
        String maskedLocal = local.length() <= 1 ? "*" : local.charAt(0) + "***";
        return maskedLocal + "@" + domain;
    }

    public static String tokenFingerprint(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return "sha256:empty";
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return "sha256:" + toHex(hash).substring(0, 12);
        } catch (NoSuchAlgorithmException e) {
            return "sha256:unavailable";
        }
    }

    public static String exceptionType(Throwable ex) {
        if (ex == null) {
            return "UnknownException";
        }
        return ex.getClass().getSimpleName();
    }

    private static String toHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            builder.append(String.format("%02x", b));
        }
        return builder.toString();
    }
}
