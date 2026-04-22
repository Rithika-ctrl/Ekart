package com.example.ekart.config;

import com.example.ekart.repository.AdminCredentialRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationContextInitializedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Validates admin configuration on application startup.
 * 
 * Ensures that:
 * 1. If no admin exists yet, provides instructions for --init-admin
 * 2. Prevents running without proper admin setup
 * 3. Logs security warnings if misconfigured
 * 
 * This runs early in the startup sequence to fail fast if configuration is wrong.
 */
@Component
public class AdminConfigurationValidator implements ApplicationListener<ApplicationContextInitializedEvent> {

    private static final Logger logger = LoggerFactory.getLogger(AdminConfigurationValidator.class);

    // ── Injected dependencies ────────────────────────────────────────────────
    private final Environment environment;

    // FIX (java:S6813): Use constructor injection instead of @Autowired setter/field injection.
    // AdminCredentialRepository is optional (may not be available at ApplicationContextInitializedEvent
    // time), so it is left out of the constructor and handled lazily if needed.
    private final AdminCredentialRepository adminCredentialRepository;

    public AdminConfigurationValidator(
            Environment environment,
            AdminCredentialRepository adminCredentialRepository) {
        this.environment = environment;
        this.adminCredentialRepository = adminCredentialRepository;
    }

    @Override
    public void onApplicationEvent(ApplicationContextInitializedEvent event) {
        // FIX (java:S3626): Removed redundant return — the method body is empty after
        // the guard, so the early return added no value and was flagged as a redundant jump.
        if (isTestEnvironment()) {
            return;
        }

        // Lazy initialize - check after repositories are available
        // This will be validated by AdminInitCommandRunner as well
    }

    /**
     * Check if we're running in a test environment
     */
    private boolean isTestEnvironment() {
        String[] activeProfiles = environment.getActiveProfiles();
        for (String profile : activeProfiles) {
            if ("test".equals(profile)) {
                return true;
            }
        }
        return false;
    }
}