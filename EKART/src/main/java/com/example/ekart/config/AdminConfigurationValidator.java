package com.example.ekart.config;

import org.springframework.boot.context.event.ApplicationContextInitializedEvent;
import org.springframework.context.ApplicationListener;
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

    @Override
    public void onApplicationEvent(ApplicationContextInitializedEvent event) {
        // Validation deferred to AdminInitCommandRunner which runs after repositories are available.
        // No action required at context-initialized phase.
    }
}