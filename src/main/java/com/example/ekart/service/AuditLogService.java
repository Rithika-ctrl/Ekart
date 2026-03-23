/**
 * File: AuditLogService.java
 * Description: Service for emitting structured audit log messages.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    public void logPolicyAction(String action, String policyTitle, String adminId) {
        log.info("[AUDIT] POLICY {} : '{}' by admin {} at {}", action, policyTitle, adminId, LocalDateTime.now());
    }
}
