package com.mesaro.email.layout;

import com.mesaro.email.ReservationEmailData;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationEmailComposerTest {

    @Test
    void confirmation_buildsStructuredHtmlWithCancelCtaAndPlainTextFallback() {
        ReservationEmailData data = new ReservationEmailData(
                "RES-2026-ABCD1234",
                "Guest <Name>",
                "guest@example.com",
                2,
                Instant.parse("2026-01-15T18:00:00Z"),
                Instant.parse("2026-01-15T19:30:00Z"),
                "UTC",
                "Demo Bistro",
                "demo-restaurant",
                List.of("T1"),
                "cancel-token"
        );

        var composed = ReservationEmailComposer.confirmation(data, "http://localhost:3000");
        EmailLayout layout = new EmailLayout("http://localhost:3000", "support@mesaro.com");
        String html = layout.render(composed.document());

        assertThat(composed.subject()).contains("RES-2026-ABCD1234");
        assertThat(composed.plainBody()).contains("cancelToken=cancel-token");
        assertThat(composed.plainBody()).contains("Confirmation Code: RES-2026-ABCD1234");
        assertThat(composed.document().ctaLabel()).isEqualTo("Cancel reservation");
        assertThat(composed.document().ctaUrl()).contains("/r/demo-restaurant/reservation/RES-2026-ABCD1234");
        assertThat(composed.document().ctaUrl()).contains("cancelToken=cancel-token");
        assertThat(html).contains("role=\"presentation\"");
        assertThat(html).contains("Guest &lt;Name&gt;");
        assertThat(html).contains("Demo Bistro");
        assertThat(html).contains("Cancel reservation");
        assertThat(html).doesNotContain("-------------------");
    }

    @Test
    void reminder_buildsDetailRowsWithoutCta() {
        var composed = ReservationEmailComposer.reminder(
                "Ada",
                "Demo Bistro",
                "RES-1",
                4,
                "Thursday, Jan 15 at 19:00",
                "Europe/Brussels"
        );

        assertThat(composed.document().ctaUrl()).isNull();
        assertThat(composed.document().bodyHtml()).contains("Confirmation");
        assertThat(composed.plainBody()).contains("RES-1");
        assertThat(composed.plainBody()).contains("cancellation link");
    }

    @Test
    void bookingPageUrl_usesSlugWhenPresent() {
        assertThat(ReservationEmailComposer.bookingPageUrl("http://localhost:3000", "demo-restaurant"))
                .isEqualTo("http://localhost:3000/r/demo-restaurant");
        assertThat(ReservationEmailComposer.bookingPageUrl("http://localhost:3000/", null))
                .isEqualTo("http://localhost:3000");
    }
}
