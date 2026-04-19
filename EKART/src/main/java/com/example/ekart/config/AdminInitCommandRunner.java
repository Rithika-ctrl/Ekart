package com.example.ekart.config;

import com.example.ekart.service.AdminBootstrapService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Command-line runner for admin bootstrap initialization.
 * 
 * Executes when app starts with --init-admin flag and creates the first admin
 * account using ADMIN_EMAIL and ADMIN_PASSWORD environment variables.
 * 
 * SECURITY:
 * - Never logs passwords in plain text
 * - Validates all inputs before creating account
 * - Exits with error code if initialization fails
 * - Only creates account if no admin exists yet
 * 
 * USAGE:
 *   export ADMIN_EMAIL="admin@company.com"
 *   export ADMIN_PASSWORD="SecurePassword123!@#"
 *   java -jar app.jar --init-admin
 */
@Component
public class AdminInitCommandRunner implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(AdminInitCommandRunner.class);

    // ── Injected dependencies ────────────────────────────────────────────────
    private final AdminBootstrapService adminBootstrapService;
    private final Environment environment;

    public AdminInitCommandRunner(
            AdminBootstrapService adminBootstrapService,
            Environment environment) {
        this.adminBootstrapService = adminBootstrapService;
        this.environment = environment;
    }




    @Override
    public void run(String... args) throws Exception {
        // Check if --init-admin flag is present
        boolean initAdminRequested = false;
        for (String arg : args) {
            if ("--init-admin".equals(arg.trim())) {
                initAdminRequested = true;
                break;
            }
        }

        if (!initAdminRequested) {
            return;
        }

        logger.info("");
        logger.info("═".repeat(80));
        logger.info("ADMIN INITIALIZATION MODE");
        logger.info("═".repeat(80));

        // Get environment variables
        String adminEmail = environment.getProperty("ADMIN_EMAIL");
        String adminPassword = environment.getProperty("ADMIN_PASSWORD");

        // Validate presence
        if (adminEmail == null || adminEmail.trim().isEmpty()) {
            logger.error("");
            logger.error("❌ ERROR: ADMIN_EMAIL environment variable is not set");
            logger.error("");
            logger.error("To initialize admin account, set:");
            logger.error("");
            logger.error("  Linux/macOS:");
            logger.error("    export ADMIN_EMAIL=\"admin@company.com\"");
            logger.error("    export ADMIN_PASSWORD=\"SecurePassword123!@#\"");
            logger.error("    java -jar app.jar --init-admin");
            logger.error("");
            logger.error("  Windows PowerShell:");
            logger.error("    $env:ADMIN_EMAIL=\"admin@company.com\"");
            logger.error("    $env:ADMIN_PASSWORD=\"SecurePassword123!@#\"");
            logger.error("    java -jar app.jar --init-admin");
            logger.error("");
            logger.error("═".repeat(80));
            System.exit(1);
        }

        if (adminPassword == null || adminPassword.isEmpty()) {
            logger.error("");
            logger.error("❌ ERROR: ADMIN_PASSWORD environment variable is not set");
            logger.error("");
            logger.error("Please set ADMIN_PASSWORD with a strong password containing:");
            logger.error("  - At least 8 characters");
            logger.error("  - Uppercase letters (A-Z)");
            logger.error("  - Lowercase letters (a-z)");
            logger.error("  - Digits (0-9)");
            logger.error("  - Special characters (!@#$%^&*...)");
            logger.error("");
            logger.error("═".repeat(80));
            System.exit(1);
        }

        // Check if admin already exists
        if (!adminBootstrapService.isInitialSetupRequired()) {
            logger.info("");
            logger.info("ℹ️  Admin account already exists. Skipping initialization.");
            logger.info("");
            logger.info("If you need to recover admin access, manually update the");
            logger.info("admin_credential table or contact your administrator.");
            logger.info("");
            logger.info("═".repeat(80));
            return;
        }

        // Attempt to create admin
        logger.info("");
        logger.info("Creating initial admin account...");
        logger.info("Email: {}", adminEmail);
        logger.info("");

        try {
            AdminBootstrapService.BootstrapResult result = 
                adminBootstrapService.createInitialAdmin(adminEmail, adminPassword);

            if (result.isSuccess()) {
                logger.info("✅ SUCCESS: {}", result.getMessage());
                logger.info("");
                logger.info("Admin account details:");
                logger.info("  Email: {}", adminEmail);
                logger.info("  Status: Active");
                logger.info("  2FA: Not yet enabled (can be enabled in dashboard)");
                logger.info("");
                logger.info("Next steps:");
                logger.info("  1. Stop the application (Ctrl+C)");
                logger.info("  2. Start normally: java -jar app.jar");
                logger.info("  3. Navigate to /admin/login");
                logger.info("  4. Login with the email and password provided");
                logger.info("  5. Change password and enable 2FA in security settings");
                logger.info("");
                logger.info("═".repeat(80));
            } else {
                logger.info("ℹ️  {}", result.getMessage());
                logger.info("");
                logger.info("═".repeat(80));
            }

        } catch (IllegalArgumentException e) {
            logger.error("");
            logger.error("❌ VALIDATION ERROR: {}", e.getMessage());
            logger.error("");
            logger.error("Password must meet these requirements:");
            logger.error("  ✓ At least 8 characters");
            logger.error("  ✓ At least one uppercase letter (A-Z)");
            logger.error("  ✓ At least one lowercase letter (a-z)");
            logger.error("  ✓ At least one digit (0-9)");
            logger.error("  ✓ At least one special character (!@#$%^&*...)");
            logger.error("");
            logger.error("Example valid password: SecureP@ssw0rd!");
            logger.error("");
            logger.error("═".repeat(80));
            System.exit(1);

        } catch (Exception e) {
            logger.error("");
            logger.error("❌ FATAL ERROR: Failed to create initial admin account");
            logger.error("Message: {}", e.getMessage());
            logger.error("");
            logger.error("Stack trace:");
            e.printStackTrace();
            logger.error("");
            logger.error("═".repeat(80));
            System.exit(1);
        }
    }
}
