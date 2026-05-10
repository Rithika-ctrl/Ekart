package com.example.ekart.service;
import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    public void logPolicyAction(String action, String policyTitle, String adminId) {
        // java:S2629 — only build the log message if INFO is enabled (avoids unconditional
        // LocalDateTime.now() evaluation when the log level would discard the output).
        // javasecurity:S5145 — policyTitle is user-controlled content; log its length only,
        // not the raw value, to prevent log injection.
        if (log.isInfoEnabled()) {
            String safeTitleInfo = (policyTitle != null)
                    ? "[length=" + policyTitle.length() + "]"
                    : "[null]";
            log.info("[AUDIT] POLICY {} : title={} by admin {} at {}",
                    action, safeTitleInfo, adminId, LocalDateTime.now());
        }
    }
}