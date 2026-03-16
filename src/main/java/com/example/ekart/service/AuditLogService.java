package com.example.ekart.service;

import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class AuditLogService {
    public void logPolicyAction(String action, String policyTitle, String adminId) {
        // In a real app, write to DB or external log system
        System.out.printf("[%s] POLICY %s: '%s' by admin %s\n", LocalDateTime.now(), action, policyTitle, adminId);
    }
}
