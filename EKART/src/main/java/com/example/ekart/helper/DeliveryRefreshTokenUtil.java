package com.example.ekart.helper;
import org.springframework.beans.factory.annotation.Value;
import java.util.Random;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.jsonwebtoken.*;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.security.Key;
import java.util.Date;

/**
 * Refresh Token Utility — manages access and refresh tokens for delivery boys.
 * 
 * SECURITY ARCHITECTURE:
 * - Access Token: Short-lived (15 minutes), used for API requests
 * - Refresh Token: Long-lived (7 days), used to get new access tokens
 * - Both tokens use same secret but can be distinguished by claims
 * 
 * USAGE:
 *   // Generate both tokens on login
 *   DeliveryTokenPair tokens = refreshTokenUtil.generateTokenPair(deliveryBoyId, email);
 *   
 *   // Refresh when access token expires
 *   String newAccessToken = refreshTokenUtil.refreshAccessToken(refreshToken);
 *   
 *   // Validate tokens
 *   if (refreshTokenUtil.isValidAccessToken(token)) { ... }
 *   if (refreshTokenUtil.isValidRefreshToken(token)) { ... }
 */
@Component
public class DeliveryRefreshTokenUtil {

    private static final Logger LOGGER = LoggerFactory.getLogger(DeliveryRefreshTokenUtil.class);

    @Value("${jwt.secret}")
    private String secretValue;

    @Value("${spring.profiles.active:default}")
    private String environment;

    // Token expiry times
    private static final long ACCESS_TOKEN_EXPIRY_MS = 15L * 60 * 1000; // 15 minutes
    private static final long REFRESH_TOKEN_EXPIRY_MS = 7L * 24 * 60 * 60 * 1000; // 7 days
    private static final String DEV_DEFAULT = "ekart-dev-default-256bit-key-change-in-production!!";

    // Static holder for use in static methods
    private static String SECRET;

    @PostConstruct
    private void initSecret() {
        SECRET = this.secretValue;

        if ((environment.contains("prod") || environment.contains("production")) &&
            SECRET.equals(DEV_DEFAULT)) {
            LOGGER.error("""

                ╔════════════════════════════════════════════════════════════════╗
                ║ ⚠️  SECURITY ALERT: JWT SECRET NOT SET FOR PRODUCTION!          ║
                ║ Delivery token refresh tokens cannot be securely signed.        ║
                ╚════════════════════════════════════════════════════════════════╝
                """);
            throw new IllegalStateException(
                "SECURITY: JWT_SECRET environment variable must be set with a strong " +
                "random value in production. Generate with: openssl rand -base64 32"
            );
        }
    }

    private Key getKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes());
    }

    /**
     * Generate both access and refresh tokens for delivery boy login.
     * 
     * @param deliveryBoyId Delivery boy ID
     * @param email Delivery boy email
     * @return DeliveryTokenPair with accessToken and refreshToken
     */
    public DeliveryTokenPair generateTokenPair(int deliveryBoyId, String email) {
        String accessToken = generateAccessToken(deliveryBoyId, email);
        String refreshToken = generateRefreshToken(deliveryBoyId, email);
        return new DeliveryTokenPair(accessToken, refreshToken);
    }

    /**
     * Generate short-lived access token (15 minutes).
     */
    private String generateAccessToken(int deliveryBoyId, String email) {
        return Jwts.builder()
                .setSubject(String.valueOf(deliveryBoyId))
                .claim("email", email)
                .claim("type", "access")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + ACCESS_TOKEN_EXPIRY_MS))
                .signWith(getKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Generate long-lived refresh token (7 days).
     */
    private String generateRefreshToken(int deliveryBoyId, String email) {
        return Jwts.builder()
                .setSubject(String.valueOf(deliveryBoyId))
                .claim("email", email)
                .claim("type", "refresh")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + REFRESH_TOKEN_EXPIRY_MS))
                .signWith(getKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Refresh access token using a valid refresh token.
     * 
     * @param refreshToken Valid refresh token
     * @return New access token
     * @throws JwtException if refresh token is invalid or expired
     */
    public String refreshAccessToken(String refreshToken) {
        if (!isValidRefreshToken(refreshToken)) {
            throw new JwtException("Invalid or expired refresh token");
        }

        Claims claims = getClaims(refreshToken);
        int deliveryBoyId = Integer.parseInt(claims.getSubject());
        String email = (String) claims.get("email");

        return generateAccessToken(deliveryBoyId, email);
    }

    /**
     * Extract delivery boy ID from access token.
     */
    public int getDeliveryBoyId(String token) {
        return Integer.parseInt(getClaims(token).getSubject());
    }

    /**
     * Extract email from access token.
     */
    public String getEmail(String token) {
        return (String) getClaims(token).get("email");
    }

    /**
     * Check if token is a valid access token (not expired, correct type).
     */
    public boolean isValidAccessToken(String token) {
        try {
            Claims claims = getClaims(token);
            String type = (String) claims.get("type");
            return "access".equals(type);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Check if token is a valid refresh token (not expired, correct type).
     */
    public boolean isValidRefreshToken(String token) {
        try {
            Claims claims = getClaims(token);
            String type = (String) claims.get("type");
            return "refresh".equals(type);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Check if any JWT token is valid (regardless of type).
     */
    public boolean isValidToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Get token expiry time in milliseconds until expiration.
     * Useful for client to know when to refresh.
     * 
     * @return Milliseconds until expiry, 0 if already expired
     */
    public long getTokenExpiryIn(String token) {
        try {
            Claims claims = getClaims(token);
            Date expiry = claims.getExpiration();
            long now = System.currentTimeMillis();
            long expiryTime = expiry.getTime() - now;
            return Math.max(expiryTime, 0);
        } catch (Exception e) {
            return 0;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    /**
     * DTO for returning token pair from login.
     */
    public static class DeliveryTokenPair {
        public String accessToken;
        public String refreshToken;
        public long expiresIn; // milliseconds

        public DeliveryTokenPair(String accessToken, String refreshToken) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.expiresIn = ACCESS_TOKEN_EXPIRY_MS;
        }

        public String getAccessToken() { return accessToken; }
        public String getRefreshToken() { return refreshToken; }
        public long getExpiresIn() { return expiresIn; }
    }
}


