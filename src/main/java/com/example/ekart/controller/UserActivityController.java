package com.example.ekart.controller;

import com.example.ekart.dto.UserActivity;
import com.example.ekart.repository.UserActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user-activity")
public class UserActivityController {
    @Autowired
    private UserActivityRepository userActivityRepository;

    @PostMapping("/batch")
    public ResponseEntity<?> logBatch(@RequestBody List<Map<String, Object>> activities) {
        for (Map<String, Object> act : activities) {
            Long userId = ((Number) act.get("userId")).longValue();
            String actionType = (String) act.get("actionType");
            String metadata = (String) act.get("metadata");
            LocalDateTime timestamp = LocalDateTime.parse((String) act.get("timestamp"));
            userActivityRepository.save(new UserActivity(userId, actionType, metadata, timestamp));
        }
        return ResponseEntity.ok().body("Logged");
    }

    @GetMapping("/user/{userId}")
    public List<UserActivity> getUserActivities(@PathVariable Long userId) {
        return userActivityRepository.findTop20ByUserIdOrderByTimestampDesc(userId);
    }
}
