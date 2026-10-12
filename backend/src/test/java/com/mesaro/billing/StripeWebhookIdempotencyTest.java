package com.mesaro.billing;

import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.checkout.Session;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StripeWebhookIdempotencyTest {

    @Mock
    private StripeService stripeService;
    @Mock
    private BillingService billingService;

    private StripeWebhookController controller;

    @BeforeEach
    void setUp() {
        controller = new StripeWebhookController(stripeService, billingService);
    }

    @Test
    void sameStripeEventDeliveredConcurrentlyIsProcessedExactlyOnce() throws Exception {
        Event event = mock(Event.class);
        Session session = mock(Session.class);
        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        when(event.getId()).thenReturn("evt_idem_test");
        when(event.getType()).thenReturn("checkout.session.completed");
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);
        when(deserializer.getObject()).thenReturn(Optional.of(session));
        when(stripeService.constructWebhookEvent(any(), any())).thenReturn(event);

        AtomicBoolean first = new AtomicBoolean(true);
        when(billingService.tryClaimEvent("evt_idem_test", "checkout.session.completed"))
                .thenAnswer(ignored -> first.getAndSet(false));

        int threads = 10;
        ExecutorService exec = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<ResponseEntity<Void>>> futures = new ArrayList<>();

        try {
            for (int i = 0; i < threads; i++) {
                futures.add(exec.submit(() -> {
                    ready.countDown();
                    start.await(5, TimeUnit.SECONDS);
                    return controller.handleWebhook("{}", "sig");
                }));
            }
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            for (Future<ResponseEntity<Void>> future : futures) {
                assertThat(future.get(10, TimeUnit.SECONDS).getStatusCode().is2xxSuccessful()).isTrue();
            }
        } finally {
            exec.shutdownNow();
        }

        verify(billingService, times(1)).handleCheckoutSessionCompleted(session);
    }
}
