package com.example.ekart.helper;

import io.jsonwebtoken.*;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

/**
 * JWT Utility — generates and validates tokens for Flutter/mobile API auth.
 * Token contains: customerId, email, role
 * Expiry: 7 days
 *
 * Place in: src/main/java/com/example/ekart/helper/JwtUtil.java
 */
@Component
public class JwtUtil {

    // Use a strong secret — ideally from .env: jwt.secret=your-256-bit-secret
    private static final String SECRET = "ekart-super-secret-jwt-key-2024-minimum-256bits!!";
    private static final long EXPIRY_MS = 7L * 24 * 60 * 60 * 1000; // 7 days

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