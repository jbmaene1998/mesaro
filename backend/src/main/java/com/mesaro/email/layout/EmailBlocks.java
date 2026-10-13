package com.mesaro.email.layout;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Small HTML fragments for transactional email bodies.
 */
public final class EmailBlocks {

    private EmailBlocks() {
    }

    public static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    public static String paragraph(String htmlOrText) {
        return "<p style=\"margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#3E4A32;\">"
                + htmlOrText + "</p>";
    }

    public static String plainParagraph(String text) {
        return paragraph(escape(text));
    }

    public static String mutedNote(String text) {
        return "<p style=\"margin:16px 0 0 0;font-size:13px;line-height:1.5;color:#3E4A32;\">"
                + escape(text) + "</p>";
    }

    public static String nl2br(String text) {
        return escape(text).replace("\r\n", "\n").replace("\n", "<br/>");
    }

    public static String detailRows(LinkedHashMap<String, String> rows) {
        if (rows == null || rows.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" ")
                .append("style=\"margin:8px 0 20px 0;border-collapse:collapse;background:#F6EFE6;border:1px solid #e6d9c8;\">");
        for (Map.Entry<String, String> entry : rows.entrySet()) {
            sb.append("<tr>")
                    .append("<td style=\"padding:12px 14px;font-size:13px;line-height:1.4;color:#3E4A32;width:38%;")
                    .append("border-bottom:1px solid #e6d9c8;vertical-align:top;\">")
                    .append(escape(entry.getKey()))
                    .append("</td>")
                    .append("<td style=\"padding:12px 14px;font-size:15px;line-height:1.4;color:#3E4A32;font-weight:600;")
                    .append("border-bottom:1px solid #e6d9c8;vertical-align:top;\">")
                    .append(escape(entry.getValue() == null ? "" : entry.getValue()))
                    .append("</td>")
                    .append("</tr>");
        }
        sb.append("</table>");
        return sb.toString();
    }
}
