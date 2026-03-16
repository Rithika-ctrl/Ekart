package com.example.ekart.repository;

import com.example.ekart.model.Policy;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface PolicyRepository extends JpaRepository<Policy, Long> {
    Optional<Policy> findBySlug(String slug);

    @Modifying
    @Transactional
    void deleteBySlug(String slug);
}
