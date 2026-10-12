package com.mesaro.contact;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.config.AppProperties;
import com.mesaro.infra.EmailService;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ContactService {

    private final EmailService emailService;
    private final AuditService auditService;
    private final AppProperties appProperties;

    public ContactService(EmailService emailService,
                          AuditService auditService,
                          AppProperties appProperties) {
        this.emailService = emailService;
        this.auditService = auditService;
        this.appProperties = appProperties;
    }

    public void submit(ContactRequest request) {
        // Silent success for honeypot fills — do not tip off bots.
        if (normalize(request.companyWebsite()) != null) {
            return;
        }

        String senderName = resolveSenderName(request);
        String senderEmail = normalize(request.email());
        String message = normalize(request.message());
        String restaurantName = normalize(request.restaurantName());
        String supportEmail = resolveSupportAddress();

        if (senderName == null) {
            throw new ValidationException("Name is required", "name");
        }
        if (message == null) {
            throw new ValidationException("Message is required", "message");
        }

        emailService.sendContactFormSubmission(supportEmail, senderName, senderEmail, message, restaurantName);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("name", senderName);
        details.put("email", senderEmail);
        if (restaurantName != null) {
            details.put("restaurantName", restaurantName);
        }
        auditService.record(AuditEventType.CONTACT_FORM_SUBMITTED, null, null, null, "CONTACT", details);
    }

    private String resolveSenderName(ContactRequest request) {
        String directName = normalize(request.name());
        if (directName != null) {
            return directName;
        }

        String firstName = normalize(request.firstName());
        String lastName = normalize(request.lastName());
        if (firstName == null && lastName == null) {
            return null;
        }
        if (firstName == null) {
            return lastName;
        }
        if (lastName == null) {
            return firstName;
        }
        return firstName + " " + lastName;
    }

    private String resolveSupportAddress() {
        String configured = normalize(appProperties.getEmail().getSupportAddress());
        if (configured != null) {
            return configured;
        }
        String fallback = normalize(appProperties.getEmail().getFromAddress());
        if (fallback != null) {
            return fallback;
        }
        throw new IllegalStateException("No support email configured");
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
