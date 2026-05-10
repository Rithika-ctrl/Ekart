package com.example.ekart.repository;

import java.util.Optional;
import com.example.ekart.dto.AdminCredential;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminCredentialRepository extends JpaRepository<AdminCredential, Integer> {

    /**
     * Find admin by email address
     */
    Optional<AdminCredential> findByEmail(String email);

    /**
     * Check if an admin exists with given email
     */
    boolean existsByEmail(String email);
}