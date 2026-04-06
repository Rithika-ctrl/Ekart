# EKART Production Deployment Checklist

## 🔐 Phase 1: Credential & Secret Management

### Step 1.1: Revoke Exposed Credentials
- [ ] **Gemini API Key** - REVOKE IMMEDIATELY
  - Previous key: `AIzaSyBICsUWJjWr2OmdjQlIngOWytFM5igZ0I0`
  - Action: Delete from https://console.cloud.google.com/apis/credentials
  - Add to blocklist/revocation log
  - Generate new key and store securely

- [ ] **Cloudinary Credentials** - ROTATE IMMEDIATELY
  - Previous Cloud Name: `dt2skuzaz`
  - Previous API Key: `624425421279873`
  - Previous Secret: `be6vnXm7Z4Dm3_Ef3cxnCJPtgII`
  - Action: Regenerate all from https://cloudinary.com/console/settings/api-keys
  - Store in secure vault (AWS Secrets Manager, HashiCorp Vault, etc.)

- [ ] **Gmail App Password** - CONSIDER ROTATING
  - Previous password: `exvwhuheyrsusxma`
  - Action: Generate new app password if prod uses different email
  - Verify 2FA is enabled on mail account

---

### Step 1.2: Set Up Secure Credential Storage

**Option A: AWS Secrets Manager** ✅ RECOMMENDED
```bash
# Create secrets
aws secretsmanager create-secret --name ekart/gemini-api-key \
  --secret-string '{"key":"NEW_KEY_HERE"}'

aws secretsmanager create-secret --name ekart/cloudinary \
  --secret-string '{"cloud":"xxx","key":"yyy","secret":"zzz"}'

aws secretsmanager create-secret --name ekart/db-credentials \
  --secret-string '{"username":"prod_user","password":"STRONG_PASS_32_CHARS"}'

# Java application will fetch at startup
```

**Option B: HashiCorp Vault**
```bash
# Store secrets in Vault
vault kv put secret/ekart/gemini-api-key key="NEW_KEY"
vault kv put secret/ekart/cloudinary cloud="xxx" key="yyy" secret="zzz"
```

**Option C: Environment Variables (Docker/K8s)**
```yaml
# docker-compose.yml
services:
  ekart:
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - CLOUDINARY_CLOUD=${CLOUDINARY_CLOUD}
      - CLOUDINARY_KEY=${CLOUDINARY_KEY}
      - CLOUDINARY_SECRET=${CLOUDINARY_SECRET}
      - DB_PASSWORD=${DB_PASSWORD}
```

**Option D: Local .env (Development Only)**
```bash
# EKART/.env (NEVER commit to Git)
# Already in .gitignore ✅
```

---

## 🗄️ Phase 2: Database Configuration

### Step 2.1: PostgreSQL Production Setup

**Option A: AWS RDS PostgreSQL** ✅ RECOMMENDED FOR CLOUD
```properties
# application-prod.properties
spring.datasource.url=jdbc:postgresql://ekart-prod-db.xxxxx.rds.amazonaws.com:5432/ekart
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASSWORD}
spring.datasource.driver-class-name=org.postgresql.Driver

# Connection pool for RDS
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
```

**Option B: Self-Hosted PostgreSQL**
```properties
# application-prod.properties
spring.datasource.url=jdbc:postgresql://db-prod.company.com:5432/ekart_prod
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASSWORD}
```

**Option C: DigitalOcean Managed Postgres**
```properties
spring.datasource.url=jdbc:postgresql://ekart-prod-db-do-xxxxx.db.ondigitalocean.com:25060/ekart
spring.datasource.username=${DB_USER}@ekart-prod-db
spring.datasource.password=${DB_PASSWORD}
spring.datasource.hikari.ssl=true
spring.datasource.hikari.sslmode=require
```

### Step 2.2: Verify Flyway Migration Setup
```sql
-- Create Flyway metadata table (auto-created by Flyway)
-- Verify migrations in: EKART/src/main/resources/db/migration/
-- V001__Create_AuthenticationOtp_Table.sql ✅
-- V002__Create_AdminCredential_Table.sql ✅
```

### Step 2.3: Update DDL Auto Mode
```properties
# PRODUCTION application.properties
spring.jpa.hibernate.ddl-auto=validate
# This prevents automatic schema mutations in production
# Schema updates must go through Flyway migrations
```

### Step 2.4: Create Admin Account (Post-Deployment)
```sql
-- SSH into prod DB and run:
-- First, generate BCrypt hash for password:
-- Use online tool: https://bcrypt.online
-- Or Spring Boot CLI: java -jar ekart.jar --bCryptEncode='YourPassword'

INSERT INTO admin_credential 
  (email, hashed_password, name, two_factor_enabled, failed_attempts, locked, created_at, updated_at)
VALUES 
  ('admin@company.com', '$2a$10$...bcrypt_hash_here...', 'Admin', false, 0, false, NOW(), NOW());

-- Then enable 2FA via admin dashboard
```

---

## 🛡️ Phase 3: Security Hardening

### Step 3.1: Database Security
- [ ] Enable PostgreSQL SSL/TLS:
  ```sql
  -- On DB server
  ssl = on
  ssl_cert_file = '/path/to/server.crt'
  ssl_key_file = '/path/to/server.key'
  ```

- [ ] Create restricted database user (not `postgres`):
  ```sql
  CREATE USER ekart_prod WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD_HERE';
  GRANT CONNECT ON DATABASE ekart_prod TO ekart_prod;
  GRANT USAGE ON SCHEMA public TO ekart_prod;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ekart_prod;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ekart_prod;
  ```

- [ ] Enable database audit logging:
  ```sql
  ALTER SYSTEM SET logging_collector = on;
  ALTER SYSTEM SET log_connections = on;
  ALTER SYSTEM SET log_disconnections = on;
  ALTER SYSTEM SET log_statement = 'all';
  ```

### Step 3.2: Application Security
- [ ] Enable HTTPS only:
  ```properties
  server.ssl.enabled=true
  server.ssl.key-store=${SSL_KEYSTORE_PATH}
  server.ssl.key-store-password=${SSL_KEYSTORE_PASSWORD}
  server.ssl.key-store-type=PKCS12
  ```

- [ ] Enable CORS restrictions:
  ```properties
  # In SecurityConfig instead of @CrossOrigin(origins = "*")
  cors.allowed-origins=https://app.company.com,https://admin.company.com
  ```

- [ ] Enable security headers:
  ```java
  // In SecurityConfig
  http.headers()
      .contentSecurityPolicy("default-src 'self'")
      .xssProtection()
      .frameOptions().deny();
  ```

- [ ] Enforce strong password policy:
  ```properties
  # In AdminAuthService (already implemented)
  # Password requirements: minimum 8 characters, no reuse of last 5 passwords
  ```

### Step 3.3: Network Security
- [ ] Set up firewall rules:
  ```
  Allow: Your app server IP → Database port 5432
  Allow: Your app server IP → Cloudinary API (only for outgoing)
  Allow: Your app server IP → Google APIs (only for outgoing)
  Allow: Your app server IP → Gmail SMTP (only for outgoing)
  Deny: All other database access
  ```

- [ ] Enable VPC/Private Network:
  ```
  Database should be in private subnet (not public internet)
  App servers communicate via private IP
  Use NAT Gateway for outgoing API calls
  ```

- [ ] Set up WAF (Web Application Firewall):
  ```
  Enable AWS WAF if using AWS ALB
  Rate limiting: 100 requests/minute per IP
  Block common exploits: SQLi, XSS, etc.
  ```

---

## 📊 Phase 4: Monitoring & Logging

### Step 4.1: Application Logging
```properties
# application-prod.properties
logging.level.root=warn
logging.level.com.example.ekart=info
logging.file.name=/var/log/ekart/application.log
logging.file.max-size=10MB
logging.file.max-history=30
logging.file.total-size-cap=1GB

# Log authentication attempts
logging.level.com.example.ekart.service.AdminAuthService=debug
logging.level.com.example.ekart.middleware.ReactAuthFilter=debug
```

### Step 4.2: ELK Stack / CloudWatch Logs
```bash
# Send logs to CloudWatch
# Install CloudWatch agent on app server
# Configure to send /var/log/ekart/application.log to log group "/ekart/prod"
```

### Step 4.3: Metrics & Alerts
```properties
# Enable Actuator metrics
management.endpoints.web.exposure.include=health,metrics,prometheus
management.endpoint.health.show-details=always
```

**Alert thresholds:**
- [ ] Failed login attempts > 10/minute → EMAIL ALERT
- [ ] Database connection pool exhausted → URGENT
- [ ] API response time > 2 seconds (p95) → WARNING
- [ ] Memory usage > 85% → WARNING
- [ ] Disk space < 10% → URGENT

---

## 🧪 Phase 5: Testing Before Go-Live

### Step 5.1: Security Testing
```bash
# SQL Injection Testing
curl -X POST http://localhost:8080/api/react/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin\x27 OR \x271\x27=\x271","password":"test"}'
# Should reject with proper error, not crash

# CSRF Testing
# Verify tokens are regenerated
# Verify X-CSRF-Token header required for mutations

# Brute Force Testing
# Try 10+ failed logins → Account should lock
# Wait 15 minutes → Account should auto-unlock
```

### Step 5.2: Performance Testing
```bash
# Load test with 100 concurrent users
# Target: < 2 sec response time (p95)
# Database should handle connection pool limits gracefully

# Tool options:
# - JMeter
# - Gatling
# - Apache Bench (ab)
```

### Step 5.3: Data Integrity Testing
```bash
# Verify OTP storage
SELECT * FROM authentication_otp WHERE email='test@test.com';
# Hashed values should not be readable

# Verify Admin storage
SELECT * FROM admin_credential WHERE email='admin@test.com';
# Password should be BCrypt hashed

# Verify AES encrypted columns
SELECT * FROM customer WHERE customer_id=1;
# Encrypted columns should not readable without key
```

---

## 🚀 Phase 6: Deployment Steps

### Step 6.1: Build Production JAR
```bash
cd EKART

# Clean build
mvn clean

# Build with production profile
mvn -Pprod -DskipTests package

# Verify JAR
ls -lh target/ekart-*.jar
```

### Step 6.2: Deployment (Docker Recommended)
```dockerfile
# Dockerfile
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY target/ekart-*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

```bash
# Build and push
docker build -t ekart:prod .
docker tag ekart:prod your-registry/ekart:prod
docker push your-registry/ekart:prod

# Deploy
docker run -d \
  -p 8080:8080 \
  -e DB_USER=$DB_USER \
  -e DB_PASSWORD=$DB_PASSWORD \
  -e GEMINI_API_KEY=$GEMINI_API_KEY \
  -e CLOUDINARY_CLOUD=$CLOUDINARY_CLOUD \
  -e CLOUDINARY_KEY=$CLOUDINARY_KEY \
  -e CLOUDINARY_SECRET=$CLOUDINARY_SECRET \
  --name ekart-prod \
  your-registry/ekart:prod
```

### Step 6.3: Verify Health Check
```bash
# Wait for startup (30-60 seconds)
sleep 30

# Test health endpoint
curl http://localhost:8080/actuator/health

# Expected response:
# {"status":"UP"}

# Test API
curl -X POST http://localhost:8080/api/react/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"test_password"}'
```

---

## 📋 Phase 7: Post-Deployment Verification

### Step 7.1: Verify All Systems Working
- [ ] Admin login works (without 2FA)
- [ ] Enable 2FA for admin account
- [ ] Customer registration works
- [ ] Vendor login works
- [ ] File uploads to Cloudinary working
- [ ] Emails being sent via Gmail SMTP
- [ ] AI Assistant using Gemini (if enabled in prod)
- [ ] Database backups running

### Step 7.2: Monitor First 24 Hours
- [ ] Any error spikes in logs?
- [ ] Database connections stable?
- [ ] Memory/CPU usage normal?
- [ ] API response times acceptable?
- [ ] Failed authentication attempts? (should be low)

### Step 7.3: User Acceptance Testing (UAT)
- [ ] Have QA team test core flows
- [ ] Verify all admin features work
- [ ] Test with realistic data volume
- [ ] Load test with 50+ concurrent users

---

## 🔄 Phase 8: Ongoing Maintenance

### Step 8.1: Backup Strategy
```bash
# Daily PostgreSQL backups
0 2 * * * pg_dump -U ekart_prod ekart_prod > /backups/ekart_$(date +\%Y\%m\%d).sql

# Store backups:
# - Local: /backups/
# - Cloud: S3 bucket with versioning enabled
# - Retention: 30 days minimum
```

### Step 8.2: Security Patching
- [ ] Enable automatic PostgreSQL security patches
- [ ] Review JDK security updates monthly
- [ ] Test updates in staging before production
- [ ] Keep Spring Boot dependencies current

### Step 8.3: Credential Rotation Schedule
```
Gemini API Key:      Every 6 months
Cloudinary Secrets:  Every 6 months  
Gmail App Password:  Every 3 months
DB Password:         Every 6 months
SSL Certificates:    Before expiration
```

### Step 8.4: Audit Logging Review
- [ ] Review admin login attempts weekly
- [ ] Check database access logs for anomalies
- [ ] Monitor failed authentication attempts (> 10/day = investigate)
- [ ] Archive logs for compliance (1 year minimum)

---

## ✅ Sign-Off Checklist

Before marking as PRODUCTION READY:

- [ ] All exposed credentials have been revoked
- [ ] New credentials generated and stored securely
- [ ] PostgreSQL configured with strong passwords
- [ ] HTTPS enabled and working
- [ ] Database backups verified
- [ ] Firewall rules implemented
- [ ] Logging and monitoring enabled
- [ ] Health checks passing
- [ ] Security tests passed
- [ ] Performance tests acceptable
- [ ] Admin account created with 2FA
- [ ] Emergency contact list established
- [ ] Disaster recovery plan documented
- [ ] All team members trained on production access
- [ ] No secrets in Git repository

---

## 📞 Emergency Contacts

```
Security Incident:   [Your Security Team]
Database Issues:     [Your DBA Team]
Application Error:   [Your DevOps Team]
24/7 On-Call:        [Page duty contact info]
```

---

## 📚 References

- [SECURITY-CONFIGURATION.md](./SECURITY-CONFIGURATION.md) - Detailed security config
- [AWS Secrets Manager Setup](https://docs.aws.amazon.com/secretsmanager/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html#SQL-SYNTAX-IDENTIFIERS)
- [Spring Security Best Practices](https://spring.io/guides/topicals/spring-security-architecture/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Status:** 🔴 NOT READY FOR PRODUCTION  
**Last Updated:** April 6, 2026  
**Owner:** DevOps Team  

⚠️ **DO NOT DEPLOY TO PRODUCTION WITHOUT COMPLETING ALL PHASES**
