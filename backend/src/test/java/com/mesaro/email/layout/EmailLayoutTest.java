package com.mesaro.email.layout;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;

import static org.assertj.core.api.Assertions.assertThat;

class EmailLayoutTest {

    private EmailLayout layout;

    @BeforeEach
    void setUp() {
        layout = new EmailLayout("http://localhost:3000/", "support@mesaro.com");
    }

    @Test
    void render_usesInlineCidLogoAndPresentationalTables() {
        EmailDocument doc = EmailDocument.of(
                "Welcome to Mesaro",
                "Your account is ready",
                EmailBlocks.plainParagraph("Hello"),
                "Start Setup",
                layout.url("/onboarding"),
                EmailTone.DEFAULT
        );

        String html = layout.render(doc);

        assertThat(html).contains("lang=\"en\"");
        assertThat(html).contains("dir=\"ltr\"");
        assertThat(html).contains("role=\"presentation\"");
        assertThat(html).contains("cid:" + EmailBrandAssets.LOGO_CONTENT_ID);
        assertThat(html).doesNotContain("/brand/mesaro-wordmark.png");
        assertThat(html).doesNotContain(".svg");
        assertThat(html).contains("display:none");
        assertThat(html).contains("Your account is ready");
        assertThat(html).contains("Welcome to Mesaro");
        assertThat(html).contains("Start Setup");
        assertThat(html).contains("http://localhost:3000/onboarding");
        assertThat(html).contains("mailto:support@mesaro.com");
        assertThat(html).contains("Sent by Mesaro");
    }

    @Test
    void render_escapesUserControlledTitleAndPreheader() {
        EmailDocument doc = EmailDocument.of(
                "<script>alert(1)</script>",
                "Hi \"friend\" & family",
                EmailBlocks.paragraph("ok"),
                null,
                null,
                EmailTone.DEFAULT
        );

        String html = layout.render(doc);

        assertThat(html).doesNotContain("<script>");
        assertThat(html).contains("&lt;script&gt;alert(1)&lt;/script&gt;");
        assertThat(html).contains("Hi &quot;friend&quot; &amp; family");
    }

    @Test
    void securityTone_usesOliveAccent() {
        String html = layout.render(EmailDocument.of(
                "Reset your password",
                "Secure your account",
                EmailBlocks.plainParagraph("Reset"),
                "Reset Password",
                layout.url("/reset-password?token=abc"),
                EmailTone.SECURITY
        ));

        assertThat(html).contains("background:#3E4A32;height:4px");
    }

    @Test
    void detailRows_escapeValuesAndUsePresentationalTable() {
        LinkedHashMap<String, String> rows = new LinkedHashMap<>();
        rows.put("Name", "<b>Guest</b>");
        String html = EmailBlocks.detailRows(rows);

        assertThat(html).contains("role=\"presentation\"");
        assertThat(html).contains("&lt;b&gt;Guest&lt;/b&gt;");
        assertThat(html).doesNotContain("<b>Guest</b>");
    }
}
