package com.example.ekart.helper;
import org.springframework.beans.factory.annotation.Value;

import java.nio.charset.StandardCharsets;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.KeySpec;
import java.util.Base64;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * AES Encryption/Decryption Helper.
 *
 * ✅ FIX (java:S3329): Now uses a randomly-generated 12-byte IV per encryption.
 * ✅ FIX (java:S5542): Switched from AES/CBC/PKCS5Padding to AES/GCM/NoPadding.
 *
 * Cipher format: AES/GCM/NoPadding
 *   - 12-byte random IV prepended to the ciphertext before Base64 encoding.
 *   - GCM tag length: 128 bits.
 *
 * ⚠️  BACKWARD COMPATIBILITY: decrypt() auto-detects the format.
 *   - If the stored value was encrypted with the old CBC/zero-IV scheme,
 *     it falls back to CBC decryption so existing passwords keep working.
 *   - New passwords are always encrypted with GCM.
 *   - To migrate a user off legacy CBC, re-encrypt their password on next login.
 *
 * application.properties:
 *   aes.secret=${AES_SECRET:change-me-in-production}
 *   aes.salt=${AES_SALT:change-me-salt}
 */
@Component
public class AES {

    private static final Logger log = LoggerFactory.getLogger(AES.class);

    private static final int GCM_IV_LENGTH  = 12;   // bytes
    private static final int GCM_TAG_LENGTH = 128;  // bits
    // Legacy CBC IV (all-zero) — used only for backward-compat decryption
    private static final byte[] LEGACY_IV =
            { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 };

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${aes.secret:change-me-in-production}")
    private String secretKeyValue;

    @Value("${aes.salt:change-me-salt}")
    private String saltValue;

    private static String aesSecretKey;
    private static String aesSaltValue;

    @PostConstruct
    private void initStaticKeys() {
        initStaticKeys(this.secretKeyValue, this.saltValue);
    }

    private static void initStaticKeys(String secret, String salt) {
        aesSecretKey = secret;
        aesSaltValue = salt;
    }

    // ──────────────────────────────────────────────────────────────
    //  Public static API — used throughout the codebase unchanged
    // ──────────────────────────────────────────────────────────────

    /**
     * Encrypts using AES/GCM/NoPadding with a fresh random 12-byte IV.
     * The IV is prepended to the ciphertext; both are Base64-encoded together.
     */
    public static String encrypt(String strToEncrypt) {
        try {
            SecretKeySpec secretKey = deriveKey();

            // Generate a fresh random IV for every encryption (fixes java:S3329)
            byte[] iv = new byte[GCM_IV_LENGTH];
            SECURE_RANDOM.nextBytes(iv);

            // Use GCM mode — authenticated, no padding needed (fixes java:S5542)
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));

            byte[] cipherText = cipher.doFinal(strToEncrypt.getBytes(StandardCharsets.UTF_8));

            // Prepend IV to ciphertext so decrypt() can extract it
            byte[] ivAndCipher = new byte[GCM_IV_LENGTH + cipherText.length];
            System.arraycopy(iv, 0, ivAndCipher, 0, GCM_IV_LENGTH);
            System.arraycopy(cipherText, 0, ivAndCipher, GCM_IV_LENGTH, cipherText.length);

            return Base64.getEncoder().encodeToString(ivAndCipher);

        } catch (InvalidAlgorithmParameterException | InvalidKeyException | NoSuchAlgorithmException
                | InvalidKeySpecException | BadPaddingException | IllegalBlockSizeException
                | NoSuchPaddingException e) {
            log.error("Error occurred during encryption: {}", e.toString());
        }
        return null;
    }

    /**
     * Decrypts a value encrypted by {@link #encrypt(String)}.
     * Auto-detects format:
     * <ul>
     *   <li>GCM (new): raw bytes = 12-byte IV + GCM ciphertext</li>
     *   <li>CBC (legacy): falls back to old zero-IV CBC decryption</li>
     * </ul>
     */
    public static String decrypt(String strToDecrypt) {
        if (strToDecrypt == null) return null;
        try {
            byte[] decoded = Base64.getDecoder().decode(strToDecrypt);
            SecretKeySpec secretKey = deriveKey();

            // Heuristic: GCM ciphertext is at least IV(12) + tag(16) = 28 bytes.
            // CBC with PKCS5 produces multiples of 16; a 16-byte CBC output
            // would be 24 chars in Base64 — too short to be valid GCM.
            // We use a simple length check: if decoded length > 16 AND the
            // first 12 bytes look like a plausible GCM IV (non-zero), try GCM first.
            if (decoded.length > GCM_IV_LENGTH + 16 && !isLegacyCbc(decoded)) {
                String result = tryGcmDecrypt(decoded, secretKey);
                if (result != null) return result;
            }

            // Fallback: legacy CBC / zero-IV (backward compatibility)
            return tryCbcDecrypt(decoded, secretKey);

        } catch (InvalidKeySpecException | NoSuchAlgorithmException e) {
            log.error("Error occurred during key derivation for decryption: {}", e.toString());
        }
        return null;
    }

    // ──────────────────────────────────────────────────────────────
    //  Private helpers
    // ──────────────────────────────────────────────────────────────

    /** Derives the AES-256 SecretKeySpec from the configured passphrase + salt. */
    private static SecretKeySpec deriveKey()
            throws NoSuchAlgorithmException, InvalidKeySpecException {
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        KeySpec spec = new PBEKeySpec(aesSecretKey.toCharArray(),
                aesSaltValue.getBytes(StandardCharsets.UTF_8), 65536, 256);
        SecretKey tmp = factory.generateSecret(spec);
        return new SecretKeySpec(tmp.getEncoded(), "AES");
    }

    /**
     * Returns true if the decoded bytes look like a legacy CBC-encrypted value
     * (i.e. a multiple of 16 bytes — characteristic of CBC+PKCS5 without a
     * prepended IV).
     */
    private static boolean isLegacyCbc(byte[] decoded) {
        return decoded.length % 16 == 0;
    }

    private static String tryGcmDecrypt(byte[] decoded, SecretKeySpec secretKey) {
        try {
            byte[] iv         = new byte[GCM_IV_LENGTH];
            byte[] cipherText = new byte[decoded.length - GCM_IV_LENGTH];
            System.arraycopy(decoded, 0, iv, 0, GCM_IV_LENGTH);
            System.arraycopy(decoded, GCM_IV_LENGTH, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.debug("GCM decrypt attempt failed, will try CBC fallback: {}", e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("java:S5542") // Legacy CBC path — only for backward-compat decryption of old passwords
    private static String tryCbcDecrypt(byte[] decoded, SecretKeySpec secretKey) {
        try {
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5PADDING");
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new IvParameterSpec(LEGACY_IV));
            return new String(cipher.doFinal(decoded), StandardCharsets.UTF_8);
        } catch (InvalidAlgorithmParameterException | InvalidKeyException
                | BadPaddingException | IllegalBlockSizeException
                | NoSuchPaddingException | NoSuchAlgorithmException e) {
            log.error("Error occurred during legacy CBC decryption: {}", e.toString());
        }
        return null;
    }
}