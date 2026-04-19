package com.example.ekart.repository;
import java.util.Optional;
import java.time.LocalDateTime;

import com.example.ekart.dto.AuthenticationOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AuthenticationOtpRepository extends JpaRepository<AuthenticationOtp, Integer> {

    /**
     * Find the most recent unused OTP for an email and purpose
     */
    @Query("SELECT o FROM AuthenticationOtp o WHERE o.email = :email AND o.purpose = :purpose " +
           "AND o.used = false ORDER BY o.createdAt DESC LIMIT 1")
    Optional<AuthenticationOtp> findLatestByEmailAndPurpose(
            @Param("email") String email,
            @Param("purpose") String purpose
    );

    /**
     * Find all OTPs (used or unused) for an email
     */
    @Query("SELECT o FROM AuthenticationOtp o WHERE o.email = :email AND o.purpose = :purpose " +
           "ORDER BY o.createdAt DESC LIMIT 5")
    List<AuthenticationOtp> findRecentByEmailAndPurpose(
            @Param("email") String email,
            @Param("purpose") String purpose
    );

    /**
     * Delete expired OTPs older than a given timestamp
     */
    @Query("DELETE FROM AuthenticationOtp o WHERE o.createdAt < :before")
    void deleteExpiredOtps(@Param("before") LocalDateTime before);

    /**
     * Find all unused OTPs for an email
     */
    @Query("SELECT o FROM AuthenticationOtp o WHERE o.email = :email AND o.used = false")
    List<AuthenticationOtp> findUnusedByEmail(@Param("email") String email);

    /**
     * Count used OTPs in the last hour for an email (for rate limiting)
     */
    @Query("SELECT COUNT(o) FROM AuthenticationOtp o WHERE o.email = :email " +
           "AND o.used = true AND o.usedAt >= :since")
    int countUsedInPeriod(@Param("email") String email, @Param("since") LocalDateTime since);
}

