package com.mesaro.billing;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StripeWebhookControllerTest {

    @Mock private StripeService stripeService;
    @Mock private BillingService billingService;

    private StripeWebhookController controller;

    private static final String RAW_PAYLOAD = "{\"id\":\"evt_123\",\"type\":\"checkout.session.completed\"}";
    private static final String SIG_HEADER = "t=1234,v1=abc";

    @BeforeEach
    void setUp() {
        controller = new StripeWebhookController(stripeService, billingService);
    }

    @Test
    void handleWebhook_invalidSignature_returns400() throws SignatureVerificationException {
        when(stripeService.constructWebhookEvent(any(), any()))
                .thenThrow(new SignatureVerificationException("bad sig", SIG_HEADER));

        ResponseEntity<Void> response = controller.handleWebhook(RAW_PAYLOAD, SIG_HEADER);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(billingService);
    }

    @Test
    void handleWebhook_alreadyClaimedEvent_returns200WithoutRouting()
            throws SignatureVerificationException {
        Event event = mockEvent("evt_123", "checkout.session.completed");
        when(stripeService.constructWebhookEvent(any(), any())).thenReturn(event);
        when(billingService.tryClaimEvent("evt_123", "checkout.session.completed")).thenReturn(false);

        ResponseEntity<Void> response = controller.handleWebhook(RAW_PAYLOAD, SIG_HEADER);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(billingService, never()).handleCheckoutSessionCompleted(any());
        verify(billingService, never()).markEventDone(any());
    }

    @Test
    void handleWebhook_checkoutSessionCompleted_routesAndMarksDone()
            throws SignatureVerificationException {
        Session session = mock(Session.class);
        Event event = mockEventWithObject("evt_123", "checkout.session.completed", session);
        when(stripeService.constructWebhookEvent(any(), any())).thenReturn(event);
        when(billingService.tryClaimEvent("evt_123", "checkout.session.completed")).thenReturn(true);

        ResponseEntity<Void> response = controller.handleWebhook(RAW_PAYLOAD, SIG_HEADER);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(billingService).handleCheckoutSessionCompleted(session);
        verify(billingService).tryClaimEvent("evt_123", "checkout.session.completed");
        verify(billingService).markEventDone("evt_123");
        verify(billingService, never()).markEventFailed(any());
    }

    @Test
    void handleWebhook_unknownEventType_returns200AndMarksDone()
            throws SignatureVerificationException {
        Event event = mockEvent("evt_456", "some.unknown.event");
        when(stripeService.constructWebhookEvent(any(), any())).thenReturn(event);
        when(billingService.tryClaimEvent("evt_456", "some.unknown.event")).thenReturn(true);

        ResponseEntity<Void> response = controller.handleWebhook(RAW_PAYLOAD, SIG_HEADER);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(billingService).tryClaimEvent("evt_456", "some.unknown.event");
        verify(billingService).markEventDone("evt_456");
    }

    @Test
    void handleWebhook_handlerThrowsException_marksFailedAndReturns500()
            throws SignatureVerificationException {
        Session session = mock(Session.class);
        Event event = mockEventWithObject("evt_789", "checkout.session.completed", session);
        when(stripeService.constructWebhookEvent(any(), any())).thenReturn(event);
        when(billingService.tryClaimEvent("evt_789", "checkout.session.completed")).thenReturn(true);
        doThrow(new RuntimeException("DB error")).when(billingService)
                .handleCheckoutSessionCompleted(any());

        ResponseEntity<Void> response = controller.handleWebhook(RAW_PAYLOAD, SIG_HEADER);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        verify(billingService).tryClaimEvent("evt_789", "checkout.session.completed");
        verify(billingService).markEventFailed("evt_789");
        verify(billingService, never()).markEventDone(any());
    }

    @Test
    void handleWebhook_claimFailure_returns500() throws SignatureVerificationException {
        Event event = mockEvent("evt_500", "checkout.session.completed");
        when(stripeService.constructWebhookEvent(any(), any())).thenReturn(event);
        when(billingService.tryClaimEvent("evt_500", "checkout.session.completed"))
                .thenThrow(new RuntimeException("insert failed"));

        ResponseEntity<Void> response = controller.handleWebhook(RAW_PAYLOAD, SIG_HEADER);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        verify(billingService, never()).handleCheckoutSessionCompleted(any());
    }

    @Test
    void sameStripeEventDeliveredConcurrently_isRoutedExactlyOnce() throws Exception {
        Session session = mock(Session.class);
        Event event = mockEventWithObject("evt_concurrent", "checkout.session.completed", session);
        when(stripeService.constructWebhookEvent(any(), any())).thenReturn(event);

        AtomicBoolean firstClaim = new AtomicBoolean(true);
        when(billingService.tryClaimEvent("evt_concurrent", "checkout.session.completed"))
                .thenAnswer(ignored -> firstClaim.getAndSet(false));

        int threads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<ResponseEntity<Void>>> futures = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    start.await(5, TimeUnit.SECONDS);
                    return controller.handleWebhook(RAW_PAYLOAD, SIG_HEADER);
                }));
            }

            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            for (Future<ResponseEntity<Void>> future : futures) {
                assertThat(future.get(10, TimeUnit.SECONDS).getStatusCode()).isEqualTo(HttpStatus.OK);
            }
        } finally {
            executor.shutdownNow();
        }

        verify(billingService, times(1)).handleCheckoutSessionCompleted(session);
        verify(billingService, times(1)).markEventDone("evt_concurrent");
    }

    private Event mockEvent(String id, String type) {
        Event event = mock(Event.class);
        when(event.getId()).thenReturn(id);
        when(event.getType()).thenReturn(type);
        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        lenient().when(deserializer.getObject()).thenReturn(Optional.empty());
        lenient().when(event.getDataObjectDeserializer()).thenReturn(deserializer);
        return event;
    }

    private Event mockEventWithObject(String id, String type, StripeObject object) {
        Event event = mock(Event.class);
        when(event.getId()).thenReturn(id);
        when(event.getType()).thenReturn(type);
        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        when(deserializer.getObject()).thenReturn(Optional.of(object));
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);
        return event;
    }
}
