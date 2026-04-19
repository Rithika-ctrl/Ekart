package com.example.ekart.helper;

import java.nio.charset.StandardCharsets;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.KeySpec;
import java.util.Base64;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * AES Encryption/Decryption Helper.
 *
 * ✅ FIX: Was using hardcoded keys ("123456789" / "abcdefg") — those are now
 *         replaced with values injected from application.properties / .env.
 *
 *         application.properties:
 *           aes.secret=${AES_SECRET:change-me-in-production}
 *           aes.salt=${AES_SALT:change-me-salt}
 *
 *         .env (your actual secret values):
 *           AES_SECRET=your-strong-secret-key
 *           AES_SALT=your-strong-salt-value
 *
 * NOTE: Because this class is now a Spring @Component, it is instantiated
 *       by Spring. The static encrypt/decrypt methods delegate to the
 *       instance — this keeps backward compatibility with all existing
 *       callers that use AES.encrypt(...) / AES.decrypt(...).
 *
 * ⚠️  IMPORTANT: If you change AES_SECRET or AES_SALT, all previously
 *       encrypted passwords in the database will become unreadable.
 *       Only change keys on a fresh database, or re-encrypt all passwords first.
 */
@Component
public class AES {

    private static final Logger log = LoggerFactory.getLogger(AES.class);

    // Injected from application.properties → overridden by .env via DotenvConfig
    @Value("${aes.secret:change-me-in-production}")
    private String secretKeyValue;

    @Value("${aes.salt:change-me-salt}")
    private String saltValue;

    // Static holder so static methods can access the Spring-injected values
    private static String SECRET_KEY;
    private static String SALT_VALUE;

    /**
     * After Spring injects the @Value fields, copy them into the static fields
     * so that the static encrypt/decrypt methods can use them.
     */
    @PostConstruct
    private void initStaticKeys() {
        SECRET_KEY = this.secretKeyValue;
        SALT_VALUE = this.saltValue;
    }

    // ──────────────────────────────────────────────────────────────
    //  Public static API — used throughout the codebase unchanged
    // ──────────────────────────────────────────────────────────────

    public static String encrypt(String strToEncrypt) {
        try {
            byte[] iv = { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 };
            IvParameterSpec ivspec = new IvParameterSpec(iv);
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            KeySpec spec = new PBEKeySpec(SECRET_KEY.toCharArray(), SALT_VALUE.getBytes(), 65536, 256);
            SecretKey tmp = factory.generateSecret(spec);
            SecretKeySpec secretKey = new SecretKeySpec(tmp.getEncoded(), "AES");
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, ivspec);
            return Base64.getEncoder().encodeToString(cipher.doFinal(strToEncrypt.getBytes(StandardCharsets.UTF_8)));
        } catch (InvalidAlgorithmParameterException | InvalidKeyException | NoSuchAlgorithmException
                | InvalidKeySpecException | BadPaddingException | IllegalBlockSizeException
                | NoSuchPaddingException e) {
            log.error("Error occurred during encryption: {}", e.toString());
        }
        return null;
    }

    public static String decrypt(String strToDecrypt) {
        try {
            byte[] iv = { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 };
            IvParameterSpec ivspec = new IvParameterSpec(iv);
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            KeySpec spec = new PBEKeySpec(SECRET_KEY.toCharArray(), SALT_VALUE.getBytes(), 65536, 256);
            SecretKey tmp = factory.generateSecret(spec);
            SecretKeySpec secretKey = new SecretKeySpec(tmp.getEncoded(), "AES");
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5PADDING");
            cipher.init(Cipher.DECRYPT_MODE, secretKey, ivspec);
            return new String(cipher.doFinal(Base64.getDecoder().decode(strToDecrypt)));
        } catch (InvalidAlgorithmParameterException | InvalidKeyException | NoSuchAlgorithmException
                | InvalidKeySpecException | BadPaddingException | IllegalBlockSizeException
                | NoSuchPaddingException e) {
            log.error("Error occurred during decryption: {}", e.toString());
        }
        return null;
    }
}