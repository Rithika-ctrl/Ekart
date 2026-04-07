package com.example.ekart.helper;

import io.jsonwebtoken.*;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.security.Key;
import java.util.Date;

/**
 * JWT Utility — generates and validates tokens for Flutter/mobile API auth.
 * Token contains: customerId, email, role
 * Expiry: 7 days
 *
 * ✅ SECURITY: Secret is injected from application.properties / .env
 *    REQUIRED: Set JWT_SECRET environment variable with a strong 256+ bit random value
 *    Generate with: openssl rand -base64 32
 *    NO DEFAULT PROVIDED — application fails to start without this, preventing token forgery
 */
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secretValue;

    @Value("${spring.profiles.active:default}")
    private String environment;

    private static final long EXPIRY_MS = 7L * 24 * 60 * 60 * 1000; // 7 days
    private static final String DEV_DEFAULT = "ekart-dev-default-256bit-key-change-in-production!!";

    // Static holder so getKey() can be used — initialised by @PostConstruct
    private static String SECRET;

    @PostConstruct
    private void initSecret() {
        SECRET = this.secretValue;
        
        // ⚠️ SECURITY CHECK: Warn if using default secret in production
        if ((environment.contains("prod") || environment.contains("production")) && 
            SECRET.equals(DEV_DEFAULT)) {
            System.err.println("\n" +
                "╔════════════════════════════════════════════════════════════════╗\n" +
                "║ ⚠️  SECURITY ALERT: JWT SECRET NOT SET FOR PRODUCTION!          ║\n" +
                "║                                                                ║\n" +
                "║ Your JWT tokens are being signed with a KNOWN default secret.  ║\n" +
                "║ This allows ANYONE to forge valid authentication tokens.       ║\n" +
                "║                                                                ║\n" +
                "║ FIX: Set JWT_SECRET environment variable with a strong value   ║\n" +
                "║      Example: openssl rand -base64 32                          ║\n" +
                "║                                                                ║\n" +
                "║ APPLICATION WILL NOT START IN PRODUCTION WITHOUT THIS!         ║\n" +
                "╚════════════════════════════════════════════════════════════════╝\n");
            throw new IllegalStateException(
                "SECURITY: JWT_SECRET environment variable must be set with a strong " +
                "random value in production. Generate with: openssl rand -base64 32"
            );
        }
        
        // Warn in development
        if (!environment.contains("prod") && SECRET.equals(DEV_DEFAULT)) {
            System.out.println("\n" +
                "⚠️  JWT using development default (not secure). " +
                "Set JWT_SECRET env var for production.\n");
        }
    }

    private Key getKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes());
    }

    /** Generate JWT token for a customer */
    public String generateToken(int customerId, String email, String role) {
        return Jwts.builder()
                .setSubject(String.valueOf(customerId))
                .claim("email", email)
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRY_MS))
                .signWith(getKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /** Extract customer ID from token */
    public int getCustomerId(String token) {
        return Integer.parseInt(getClaims(token).getSubject());
    }

    /** Extract email from token */
    public String getEmail(String token) {
        return (String) getClaims(token).get("email");
    }

    /** Extract role from token */
    public String getRole(String token) {
        return (String) getClaims(token).get("role");
    }

    /** Validate token — returns true if valid and not expired */
    public boolean isValid(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}