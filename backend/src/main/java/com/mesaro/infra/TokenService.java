package com.mesaro.infra;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Service for generating and hashing security tokens.
 * Tokens are URL-safe base64 encoded random bytes.
 * Only hashes are stored in the database.
 */
@Service
public class TokenService {

    private static final int TOKEN_BYTES = 32; // 256 bits
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /**
     * Generate a new random token.
     * @return URL-safe base64 encoded token
     */
    public String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Hash a token using SHA-256.
     * @param token The raw token
     * @return Hex-encoded hash
     */
    public String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    /**
     * Verify a token matches a hash.
     * @param token The raw token to verify
     * @param hash The stored hash
     * @return true if token hashes to the stored value
     */
    public boolean verifyToken(String token, String hash) {
        String computedHash = hashToken(token);
        return MessageDigest.isEqual(
                computedHash.getBytes(StandardCharsets.UTF_8),
                hash.getBytes(StandardCharsets.UTF_8)
        );
    }
}
