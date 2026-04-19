package com.example.ekart.service;
import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    public void logPolicyAction(String action, String policyTitle, String adminId) {
        log.info("[AUDIT] POLICY {} : '{}' by admin {} at {}", action, policyTitle, adminId, LocalDateTime.now());
    }
}

