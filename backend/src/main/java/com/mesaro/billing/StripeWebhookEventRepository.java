package com.mesaro.billing;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StripeWebhookEventRepository extends JpaRepository<StripeWebhookEvent, Long> {

    boolean existsByEventId(String eventId);
}
