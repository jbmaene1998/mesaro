package com.mesaro.email.layout;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Year;

/**
 * Shared commercial HTML email shell (table-based, Outlook-friendly).
 */
@Component
public class EmailLayout {

    private static final String SAND = "#F6EFE6";
    private static final String TERRACOTTA = "#C8553D";
    private static final String OLIVE = "#3E4A32";
    private static final String BORDER = "#e6d9c8";
    private static final String WHITE = "#ffffff";

    private final String frontendUrl;
    private final String supportAddress;

    public EmailLayout(
            @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl,
            @Value("${app.email.support-address:support@mesaro.com}") String supportAddress) {
        this.frontendUrl = trimTrailingSlash(frontendUrl);
        this.supportAddress = supportAddress == null || supportAddress.isBlank()
                ? null
                : supportAddress.trim();
    }

    public String frontendUrl() {
        return frontendUrl;
    }

    public String supportAddress() {
        return supportAddress;
    }

    public String url(String path) {
        if (path == null || path.isBlank()) {
            return frontendUrl;
        }
        String normalized = path.startsWith("/") ? path : "/" + path;
        return frontendUrl + normalized;
    }

    public String logoUrl() {
        return url("/brand/mesaro-wordmark.png");
    }

    public String render(EmailDocument doc) {
        String title = EmailBlocks.escape(doc.title() == null ? "Mesaro" : doc.title());
        String preheader = EmailBlocks.escape(doc.preheader() == null ? "" : doc.preheader());
        String accent = accentColor(doc.tone());
        String logo = EmailBlocks.escape(logoUrl());
        String year = String.valueOf(Year.now().getValue());

        String lead = "";
        if (doc.leadHtml() != null && !doc.leadHtml().isBlank()) {
            lead = "<p style=\"margin:8px 0 0 0;font-size:15px;line-height:1.55;color:" + OLIVE + ";\">"
                    + doc.leadHtml() + "</p>";
        }

        String cta = buildCta(doc.ctaLabel(), doc.ctaUrl());
        String footerSupport = supportAddress == null
                ? ""
                : "Questions? <a href=\"mailto:" + EmailBlocks.escape(supportAddress)
                + "\" style=\"color:" + OLIVE + ";text-decoration:underline;\">"
                + EmailBlocks.escape(supportAddress) + "</a><br/>";

        return "<!doctype html>"
                + "<html lang=\"en\" dir=\"ltr\">"
                + "<head>"
                + "<meta charset=\"utf-8\"/>"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>"
                + "<meta http-equiv=\"x-ua-compatible\" content=\"ie=edge\"/>"
                + "<title>" + title + "</title>"
                + "<!--[if mso]><noscript><xml><o:OfficeDocumentSettings>"
                + "<o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->"
                + "</head>"
                + "<body style=\"margin:0;padding:0;background:" + SAND + ";\">"
                + "<div lang=\"en\" dir=\"ltr\" style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;\">"
                + preheader
                + "&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;"
                + "</div>"
                + "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" "
                + "style=\"background:" + SAND + ";margin:0;padding:0;\">"
                + "<tr><td align=\"center\" style=\"padding:24px 12px;\">"
                + "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"600\" "
                + "style=\"width:100%;max-width:600px;background:" + WHITE + ";border:1px solid " + BORDER + ";\">"
                // Logo header
                + "<tr><td style=\"padding:24px 32px;background:" + SAND + ";border-bottom:1px solid " + BORDER + ";\">"
                + "<img src=\"" + logo + "\" alt=\"Mesaro\" width=\"160\" height=\"37\" "
                + "style=\"display:block;border:0;height:37px;width:160px;\"/>"
                + "</td></tr>"
                // Accent bar
                + "<tr><td style=\"background:" + accent + ";height:4px;font-size:0;line-height:0;\">&nbsp;</td></tr>"
                // Title + body
                + "<tr><td style=\"padding:28px 32px 8px 32px;font-family:Segoe UI,Arial,sans-serif;color:" + OLIVE + ";\">"
                + "<h1 style=\"margin:0;font-size:24px;line-height:1.25;font-weight:700;color:" + OLIVE + ";\">"
                + title + "</h1>"
                + lead
                + "</td></tr>"
                + "<tr><td style=\"padding:8px 32px 28px 32px;font-family:Segoe UI,Arial,sans-serif;color:" + OLIVE + ";"
                + "font-size:16px;line-height:1.6;\">"
                + doc.bodyHtml()
                + cta
                + "</td></tr>"
                // Footer
                + "<tr><td style=\"padding:20px 32px 28px 32px;border-top:1px solid " + BORDER + ";"
                + "font-family:Segoe UI,Arial,sans-serif;font-size:12px;line-height:1.55;color:" + OLIVE + ";\">"
                + footerSupport
                + "Sent by Mesaro &middot; " + year + "<br/>"
                + "<a href=\"" + EmailBlocks.escape(frontendUrl) + "\" style=\"color:" + OLIVE
                + ";text-decoration:underline;\">Open Mesaro</a>"
                + "</td></tr>"
                + "</table>"
                + "</td></tr></table>"
                + "</body></html>";
    }

    private static String accentColor(EmailTone tone) {
        if (tone == EmailTone.SECURITY) {
            return OLIVE;
        }
        return TERRACOTTA;
    }

    private static String buildCta(String label, String url) {
        if (label == null || label.isBlank() || url == null || url.isBlank()) {
            return "";
        }
        String safeLabel = EmailBlocks.escape(label);
        String safeUrl = EmailBlocks.escape(url);
        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:28px 0 0 0;\">"
                + "<tr><td align=\"left\">"
                + "<!--[if mso]>"
                + "<v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:w=\"urn:schemas-microsoft-com:office:word\" "
                + "href=\"" + safeUrl + "\" style=\"height:44px;v-text-anchor:middle;width:220px;\" arcsize=\"8%\" "
                + "stroke=\"f\" fillcolor=\"" + TERRACOTTA + "\">"
                + "<w:anchorlock/>"
                + "<center style=\"color:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:15px;font-weight:700;\">"
                + safeLabel + "</center></v:roundrect>"
                + "<![endif]-->"
                + "<!--[if !mso]><!-->"
                + "<a href=\"" + safeUrl + "\" "
                + "style=\"display:inline-block;padding:14px 22px;background:" + TERRACOTTA + ";color:" + WHITE + ";"
                + "text-decoration:none;font-weight:700;font-size:15px;line-height:1;border:0;\">"
                + safeLabel + "</a>"
                + "<!--<![endif]-->"
                + "</td></tr></table>";
    }

    public static String trimTrailingSlash(String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
