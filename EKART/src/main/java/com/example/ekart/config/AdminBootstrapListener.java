package com.example.ekart.config;

import com.example.ekart.service.AdminBootstrapService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Startup listener for secure admin account bootstrap.
 *
 * Handles:
 * 1. Initial admin creation via --init-admin flag
 * 2. Environment variable validation
 * 3. Security-focused logging and error handling
 *
 * USAGE:
 *   export ADMIN_EMAIL="admin@company.com"
 *   export ADMIN_PASSWORD="<your-strong-password>"
 *   java -jar app.jar --init-admin
 */
@Component
public class AdminBootstrapListener implements ApplicationListener<ApplicationReadyEvent> {

    private static final Logger logger = LoggerFactory.getLogger(AdminBootstrapListener.class);

    // FIX S1192: Define constant instead of duplicating the separator literal
    private static final String SEPARATOR = "================================================================================";

    // FIX S2068: Replaced hard-coded example password with a generic placeholder to avoid
    // Sonar treating it as a real credential embedded in source code (java:S2068).
    private static final String EXAMPLE_PASSWORD_HINT = "<your-strong-password>";

    // ── Injected dependencies ────────────────────────────────────────────────
    private final AdminBootstrapService adminBootstrapService;
    private final Environment environment;

    // FIX (java:S6813): Constructor injection instead of field injection
    public AdminBootstrapListener(
            AdminBootstrapService adminBootstrapService,
            Environment environment) {
        this.adminBootstrapService = adminBootstrapService;
        this.environment = environment;
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        boolean initAdminRequested = isInitAdminRequested(event);

        if (!initAdminRequested) {
            handleNoInitAdminFlag();
            return;
        }

        performAdminInit();
    }

    /**
     * Checks whether the --init-admin flag was passed via app bootstrap args.
     */
    private boolean isInitAdminRequested(ApplicationReadyEvent event) {
        String[] args = event.getApplicationContext().getEnvironment()
                .getProperty("app.bootstrap.args", "").split(",");

        for (String arg : args) {
            if ("--init-admin".equals(arg.trim())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Handles the case where --init-admin was NOT requested.
     * Warns if initial setup is still required.
     */
    private void handleNoInitAdminFlag() {
        if (adminBootstrapService.isInitialSetupRequired()) {
            logger.warn(SEPARATOR);
            logger.warn("⚠️  ADMIN SETUP REQUIRED - Initial admin account not found");
            logger.warn(SEPARATOR);
            logger.warn("To create initial admin, set environment variables and restart with --init-admin:");
            logger.warn("  export ADMIN_EMAIL=\"admin@company.com\"");
            logger.warn("  export ADMIN_PASSWORD=\"{}\"", EXAMPLE_PASSWORD_HINT);
            logger.warn("  java -jar app.jar --init-admin");
            logger.warn(SEPARATOR);
        }
    }

    /**
     * Performs admin account initialisation using ADMIN_EMAIL and ADMIN_PASSWORD
     * environment variables. Exits the process with code 1 on failure.
     */
    private void performAdminInit() {
        logger.info("Initializing admin account from environment variables...");

        try {
            String adminEmail = environment.getProperty("ADMIN_EMAIL");
            String adminPassword = environment.getProperty("ADMIN_PASSWORD");

            if (adminEmail == null || adminPassword == null) {
                logger.error("ERROR: --init-admin requested but ADMIN_EMAIL or ADMIN_PASSWORD not set");
                logger.error("Set environment variables:");
                logger.error("  export ADMIN_EMAIL=\"your-email@company.com\"");
                logger.error("  export ADMIN_PASSWORD=\"{}\"", EXAMPLE_PASSWORD_HINT);
                System.exit(1);
            }

            AdminBootstrapService.BootstrapResult result =
                adminBootstrapService.createInitialAdmin(adminEmail, adminPassword);

            if (result.isSuccess()) {
                logger.info("✅ {}", result.getLogMessage());
                logger.info("Initial admin account created successfully!");
                logger.info("You can now login at /admin/login with the provided credentials.");
            } else {
                logger.info(result.getMessage());
            }

        } catch (IllegalArgumentException e) {
            logger.error("❌ Validation Error: {}", e.getMessage());
            System.exit(1);
        } catch (Exception e) {
            logger.error("❌ Failed to create initial admin account: {}", e.getMessage(), e);
            System.exit(1);
        }
    }
}