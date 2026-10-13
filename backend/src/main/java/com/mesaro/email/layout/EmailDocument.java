package com.mesaro.email.layout;

/**
 * Content payload for the shared HTML email shell.
 */
public record EmailDocument(
        String title,
        String preheader,
        String leadHtml,
        String bodyHtml,
        String ctaLabel,
        String ctaUrl,
        EmailTone tone
) {
    public EmailDocument {
        if (tone == null) {
            tone = EmailTone.DEFAULT;
        }
        if (bodyHtml == null) {
            bodyHtml = "";
        }
    }

    public static EmailDocument of(String title,
                                   String preheader,
                                   String bodyHtml,
                                   String ctaLabel,
                                   String ctaUrl,
                                   EmailTone tone) {
        return new EmailDocument(title, preheader, null, bodyHtml, ctaLabel, ctaUrl, tone);
    }
}
