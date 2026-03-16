package com.example.ekart.repository;

import com.example.ekart.dto.UserActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserActivityRepository extends JpaRepository<UserActivity, Long> {
    List<UserActivity> findTop20ByUserIdOrderByTimestampDesc(Long userId);
    List<UserActivity> findByUserId(Long userId);
}
