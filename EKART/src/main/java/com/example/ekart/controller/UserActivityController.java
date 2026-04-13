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
        int saved = 0;
        for (Map<String, Object> act : activities) {
            try {
                Object userIdObj = act.get("userId");
                Object tsObj     = act.get("timestamp");
                if (userIdObj == null || tsObj == null) continue; // skip malformed entries

                Long userId       = ((Number) userIdObj).longValue();
                String actionType = (String) act.getOrDefault("actionType", "UNKNOWN");
                String metadata   = (String) act.getOrDefault("metadata", "");
                LocalDateTime ts  = LocalDateTime.parse(tsObj.toString());

                userActivityRepository.save(new UserActivity(userId, actionType, metadata, ts));
                saved++;
            } catch (Exception e) {
                // Log and skip bad entry — don't fail the whole batch
                System.err.println("[UserActivityController] Skipping bad activity entry: " + e.getMessage());
            }
        }
        return ResponseEntity.ok().body("Logged " + saved + " of " + activities.size() + " entries");
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Map<String, Object>> getUserActivities(@PathVariable Long userId) {
        Map<String, Object> res = new java.util.HashMap<>();
        try {
            List<UserActivity> activities = userActivityRepository.findTop20ByUserIdOrderByTimestampDesc(userId);
            res.put("success", true);
            res.put("activities", activities);
            res.put("count", activities.size());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Error retrieving activities: " + e.getMessage());
            res.put("activities", new java.util.ArrayList<>());
            return ResponseEntity.ok(res);
        }
    }
}
