package com.mesaro.email.layout;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;

/**
 * Bundled email brand assets loaded from the classpath (not remote URLs).
 * Email clients often cannot fetch images from private or SPA hosts, so the
 * wordmark is embedded inline via CID.
 */
@Component
public class EmailBrandAssets {

    public static final String LOGO_CONTENT_ID = "mesaro-logo";
    public static final String LOGO_FILENAME = "mesaro-wordmark.png";
    public static final String LOGO_CONTENT_TYPE = "image/png";
    private static final String LOGO_CLASSPATH = "email/mesaro-wordmark.png";

    private final byte[] logoPngBytes;

    public EmailBrandAssets() {
        this.logoPngBytes = loadLogoBytes();
    }

    public byte[] logoPngBytes() {
        return logoPngBytes;
    }

    private static byte[] loadLogoBytes() {
        ClassPathResource resource = new ClassPathResource(LOGO_CLASSPATH);
        try (InputStream in = resource.getInputStream()) {
            byte[] bytes = in.readAllBytes();
            if (bytes.length == 0) {
                throw new IllegalStateException("Email logo resource is empty: " + LOGO_CLASSPATH);
            }
            return bytes;
        } catch (IOException ex) {
            throw new IllegalStateException("Missing email logo resource on classpath: " + LOGO_CLASSPATH, ex);
        }
    }
}
