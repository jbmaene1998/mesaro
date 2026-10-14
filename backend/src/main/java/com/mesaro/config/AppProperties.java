package com.mesaro.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Type-safe configuration properties for the Mesaro application.
 *
 * Binds to the 'app' prefix in application.yml.
 * All properties are validated at startup.
 */
@ConfigurationProperties(prefix = "app")
@Validated
public class AppProperties {
    // Explicitly insecure placeholders for local/dev ergonomics.
    // A startup validator blocks these values in non-dev profiles.
    public static final String INSECURE_DEV_HOLD_TOKEN_SECRET =
            "insecure-dev-hold-secret-change-me-1234567890";
    public static final String INSECURE_DEV_RESERVATION_TOKEN_SECRET =
            "insecure-dev-reservation-secret-change-me-1234567890";
    public static final String INSECURE_DEV_STAFF_TOKEN_SECRET =
            "insecure-dev-staff-secret-change-me-1234567890";
    public static final String INSECURE_DEV_JWT_SECRET =
            "insecure-dev-jwt-secret-change-me-1234567890";

    /**
     * Base URL for the API (used in emails, links, etc.)
     */
    @NotBlank
    private String baseUrl = "http://localhost:8080";

    /**
     * API base URL (may differ from baseUrl in load-balanced environments)
     */
    @NotBlank
    private String apiBaseUrl = "http://localhost:8080";

    /**
     * Frontend application URL (used for CORS and redirect links)
     */
    @NotBlank
    private String frontendUrl = "http://localhost:3000";

    @NotNull
    private Cors cors = new Cors();

    @NotNull
    private Email email = new Email();

    @NotNull
    private Hold hold = new Hold();

    @NotNull
    private Reservation reservation = new Reservation();

    @NotNull
    private Staff staff = new Staff();

    @NotNull
    private Security security = new Security();

    @NotNull
    private Gdpr gdpr = new Gdpr();

    @NotNull
    private Logging logging = new Logging();

    // Getters and setters

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getApiBaseUrl() {
        return apiBaseUrl;
    }

    public void setApiBaseUrl(String apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
    }

    public String getFrontendUrl() {
        return frontendUrl;
    }

    public void setFrontendUrl(String frontendUrl) {
        this.frontendUrl = frontendUrl;
    }

    public Cors getCors() {
        return cors;
    }

    public void setCors(Cors cors) {
        this.cors = cors;
    }

    public Email getEmail() {
        return email;
    }

    public void setEmail(Email email) {
        this.email = email;
    }

    public Hold getHold() {
        return hold;
    }

    public void setHold(Hold hold) {
        this.hold = hold;
    }

    public Reservation getReservation() {
        return reservation;
    }

    public void setReservation(Reservation reservation) {
        this.reservation = reservation;
    }

    public Staff getStaff() {
        return staff;
    }

    public void setStaff(Staff staff) {
        this.staff = staff;
    }

    public Security getSecurity() {
        return security;
    }

    public void setSecurity(Security security) {
        this.security = security;
    }

    public Gdpr getGdpr() {
        return gdpr;
    }

    public void setGdpr(Gdpr gdpr) {
        this.gdpr = gdpr;
    }

    public Logging getLogging() {
        return logging;
    }

    public void setLogging(Logging logging) {
        this.logging = logging;
    }

    // Nested classes

    public static class Cors {
        @NotBlank
        private String allowedOrigins = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173";
        private boolean allowCredentials = false;

        public String getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(String allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }

        public String[] getAllowedOriginsArray() {
            return allowedOrigins == null ? new String[0]
                    : java.util.Arrays.stream(allowedOrigins.split(","))
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .toArray(String[]::new);
        }

        public boolean isAllowCredentials() {
            return allowCredentials;
        }

        public void setAllowCredentials(boolean allowCredentials) {
            this.allowCredentials = allowCredentials;
        }
    }

    public static class Email {
        @NotBlank
        private String provider = "log";

        @NotBlank
        private String fromAddress = "noreply@mesaro.com";

        private String fromName = "Mesaro";
        private String supportAddress = "support@mesaro.com";

        @NotNull
        private Resend resend = new Resend();

        public String getProvider() {
            return provider;
        }

        public void setProvider(String provider) {
            this.provider = provider;
        }

        public String getFromAddress() {
            return fromAddress;
        }

        public void setFromAddress(String fromAddress) {
            this.fromAddress = fromAddress;
        }

        public String getFromName() {
            return fromName;
        }

        public void setFromName(String fromName) {
            this.fromName = fromName;
        }

        public String getSupportAddress() {
            return supportAddress;
        }

        public void setSupportAddress(String supportAddress) {
            this.supportAddress = supportAddress;
        }

        public String getFormattedFrom() {
            if (fromName != null && !fromName.isBlank()) {
                return fromName + " <" + fromAddress + ">";
            }
            return fromAddress;
        }

        public Resend getResend() {
            return resend;
        }

        public void setResend(Resend resend) {
            this.resend = resend;
        }
    }

    public static class Resend {
        private String apiKey = "";
        @NotBlank
        private String apiBaseUrl = "https://api.resend.com";

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getApiBaseUrl() {
            return apiBaseUrl;
        }

        public void setApiBaseUrl(String apiBaseUrl) {
            this.apiBaseUrl = apiBaseUrl;
        }
    }

    public static class Hold {
        @Min(1)
        private int durationMinutes = 3;

        @NotBlank
        private String tokenSecret = INSECURE_DEV_HOLD_TOKEN_SECRET;

        public int getDurationMinutes() {
            return durationMinutes;
        }

        public void setDurationMinutes(int durationMinutes) {
            this.durationMinutes = durationMinutes;
        }

        public String getTokenSecret() {
            return tokenSecret;
        }

        public void setTokenSecret(String tokenSecret) {
            this.tokenSecret = tokenSecret;
        }
    }

    public static class Reservation {
        @Min(1)
        private int cancelTokenTtlDays = 7;

        @NotBlank
        private String tokenSecret = INSECURE_DEV_RESERVATION_TOKEN_SECRET;

        public int getCancelTokenTtlDays() {
            return cancelTokenTtlDays;
        }

        public void setCancelTokenTtlDays(int cancelTokenTtlDays) {
            this.cancelTokenTtlDays = cancelTokenTtlDays;
        }

        public String getTokenSecret() {
            return tokenSecret;
        }

        public void setTokenSecret(String tokenSecret) {
            this.tokenSecret = tokenSecret;
        }
    }

    public static class Staff {
        @Min(1)
        private int inviteTtlHours = 72;

        @Min(1)
        private int resetTtlHours = 2;

        @NotBlank
        private String tokenSecret = INSECURE_DEV_STAFF_TOKEN_SECRET;

        public int getInviteTtlHours() {
            return inviteTtlHours;
        }

        public void setInviteTtlHours(int inviteTtlHours) {
            this.inviteTtlHours = inviteTtlHours;
        }

        public int getResetTtlHours() {
            return resetTtlHours;
        }

        public void setResetTtlHours(int resetTtlHours) {
            this.resetTtlHours = resetTtlHours;
        }

        public String getTokenSecret() {
            return tokenSecret;
        }

        public void setTokenSecret(String tokenSecret) {
            this.tokenSecret = tokenSecret;
        }
    }

    public static class Security {
        @NotNull
        private Jwt jwt = new Jwt();

        public Jwt getJwt() {
            return jwt;
        }

        public void setJwt(Jwt jwt) {
            this.jwt = jwt;
        }
    }

    public static class Gdpr {
        private boolean retentionEnabled = true;

        @Min(30)
        private int reservationPiiRetentionDays = 365;

        @Min(30)
        private int emailLogRetentionDays = 365;

        @Min(30)
        private int auditLogRetentionDays = 365;

        @NotBlank
        private String retentionCron = "0 15 2 * * *";

        @Min(1)
        private int purgeDeletedAfterDays = 7;

        @NotBlank
        private String purgeCron = "0 30 2 * * *";

        public boolean isRetentionEnabled() {
            return retentionEnabled;
        }

        public void setRetentionEnabled(boolean retentionEnabled) {
            this.retentionEnabled = retentionEnabled;
        }

        public int getReservationPiiRetentionDays() {
            return reservationPiiRetentionDays;
        }

        public void setReservationPiiRetentionDays(int reservationPiiRetentionDays) {
            this.reservationPiiRetentionDays = reservationPiiRetentionDays;
        }

        public int getEmailLogRetentionDays() {
            return emailLogRetentionDays;
        }

        public void setEmailLogRetentionDays(int emailLogRetentionDays) {
            this.emailLogRetentionDays = emailLogRetentionDays;
        }

        public String getRetentionCron() {
            return retentionCron;
        }

        public void setRetentionCron(String retentionCron) {
            this.retentionCron = retentionCron;
        }

        public int getAuditLogRetentionDays() {
            return auditLogRetentionDays;
        }

        public void setAuditLogRetentionDays(int auditLogRetentionDays) {
            this.auditLogRetentionDays = auditLogRetentionDays;
        }

        public int getPurgeDeletedAfterDays() {
            return purgeDeletedAfterDays;
        }

        public void setPurgeDeletedAfterDays(int purgeDeletedAfterDays) {
            this.purgeDeletedAfterDays = purgeDeletedAfterDays;
        }

        public String getPurgeCron() {
            return purgeCron;
        }

        public void setPurgeCron(String purgeCron) {
            this.purgeCron = purgeCron;
        }
    }

    public static class Logging {
        @NotNull
        private Elasticsearch elasticsearch = new Elasticsearch();

        public Elasticsearch getElasticsearch() {
            return elasticsearch;
        }

        public void setElasticsearch(Elasticsearch elasticsearch) {
            this.elasticsearch = elasticsearch;
        }
    }

    public static class Elasticsearch {
        private boolean enabled = true;
        @NotBlank
        private String index = "mesaro-api-actions";
        @NotBlank
        private String auditIndex = "mesaro-audit-events";
        @Min(100)
        private int connectTimeoutMs = 1500;
        @Min(100)
        private int readTimeoutMs = 2000;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getIndex() {
            return index;
        }

        public void setIndex(String index) {
            this.index = index;
        }

        public String getAuditIndex() {
            return auditIndex;
        }

        public void setAuditIndex(String auditIndex) {
            this.auditIndex = auditIndex;
        }

        public int getConnectTimeoutMs() {
            return connectTimeoutMs;
        }

        public void setConnectTimeoutMs(int connectTimeoutMs) {
            this.connectTimeoutMs = connectTimeoutMs;
        }

        public int getReadTimeoutMs() {
            return readTimeoutMs;
        }

        public void setReadTimeoutMs(int readTimeoutMs) {
            this.readTimeoutMs = readTimeoutMs;
        }
    }

    public static class Jwt {
        @NotBlank
        private String secret = INSECURE_DEV_JWT_SECRET;

        @Min(1)
        private int accessTokenTtlMinutes = 15;

        @Min(1)
        private int refreshTokenTtlDays = 7;

        @NotBlank
        private String issuer = "mesaro-api";

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public int getAccessTokenTtlMinutes() {
            return accessTokenTtlMinutes;
        }

        public void setAccessTokenTtlMinutes(int accessTokenTtlMinutes) {
            this.accessTokenTtlMinutes = accessTokenTtlMinutes;
        }

        public int getRefreshTokenTtlDays() {
            return refreshTokenTtlDays;
        }

        public void setRefreshTokenTtlDays(int refreshTokenTtlDays) {
            this.refreshTokenTtlDays = refreshTokenTtlDays;
        }

        public String getIssuer() {
            return issuer;
        }

        public void setIssuer(String issuer) {
            this.issuer = issuer;
        }
    }
}
