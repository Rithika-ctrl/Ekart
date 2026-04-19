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
 *   export ADMIN_PASSWORD="SecurePassword123!@#"
 *   java -jar app.jar --init-admin
 */
@Component
public class AdminBootstrapListener implements ApplicationListener<ApplicationReadyEvent> {

    private static final Logger logger = LoggerFactory.getLogger(AdminBootstrapListener.class);

    // ── Injected dependencies ────────────────────────────────────────────────
    private final AdminBootstrapService adminBootstrapService;
    private final Environment environment;

    public AdminBootstrapListener(
            AdminBootstrapService adminBootstrapService,
            Environment environment) {
        this.adminBootstrapService = adminBootstrapService;
        this.environment = environment;
    }




    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        // Check if --init-admin flag is present
        String[] args = event.getApplicationContext().getEnvironment()
                .getProperty("app.bootstrap.args", "").split(",");
        
        boolean initAdminRequested = false;
        for (String arg : args) {
            if ("--init-admin".equals(arg.trim())) {
                initAdminRequested = true;
                break;
            }
        }

        // Also check programmatic args if available
        if (!initAdminRequested && org.springframework.boot.context.event.ApplicationReadyEvent.class.isAnnotationPresent(
                org.springframework.context.event.EventListener.class)) {
            // Fallback: check if initial setup is required
            if (adminBootstrapService.isInitialSetupRequired()) {
                logger.warn("================================================================================");
                logger.warn("⚠️  ADMIN SETUP REQUIRED - Initial admin account not found");
                logger.warn("================================================================================");
                logger.warn("To create initial admin, set environment variables and restart with --init-admin:");
                logger.warn("  export ADMIN_EMAIL=\"admin@company.com\"");
                logger.warn("  export ADMIN_PASSWORD=\"SecurePassword123!@#\"");
                logger.warn("  java -jar app.jar --init-admin");
                logger.warn("================================================================================");
            }
            return;
        }

        // Perform initial admin setup if requested
        if (initAdminRequested) {
            logger.info("Initializing admin account from environment variables...");
            
            try {
                String adminEmail = environment.getProperty("ADMIN_EMAIL");
                String adminPassword = environment.getProperty("ADMIN_PASSWORD");

                if (adminEmail == null || adminPassword == null) {
                    logger.error("ERROR: --init-admin requested but ADMIN_EMAIL or ADMIN_PASSWORD not set");
                    logger.error("Set environment variables:");
                    logger.error("  export ADMIN_EMAIL=\"your-email@company.com\"");
                    logger.error("  export ADMIN_PASSWORD=\"SecurePassword123!@#\"");
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
}
