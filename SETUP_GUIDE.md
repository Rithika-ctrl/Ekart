# 📋 Ekart E-Commerce Platform - Setup Guide

## ✅ Fixed Security Issues

This guide covers the security fixes applied to the Ekart application:

### 1. **Removed Exposed Credentials** 🔐
- ✅ Removed hardcoded email addresses from EmailSender.java
- ✅ Removed hardcoded Cloudinary API keys
- ✅ Removed hardcoded Gemini API key
- ✅ Removed default weak admin password
- ✅ All credentials now use environment variables

### 2. **Removed Sensitive Console Output** 🛡️
- ✅ Removed OTP printing to console (security risk)
- ✅ Removed email sending confirmation logs
- ✅ Kept error logs for debugging only

### 3. **Improved Security Configuration** 🔒
- ✅ Updated SecurityConfig with explicit public endpoint definitions
- ✅ CSRF disabled for stateless API operations (legacy app design)
- ✅ Session-based custom authentication preserved

---

## 🚀 Getting Started

### Prerequisites
- Java 17 or higher
- Maven 3.8+
- Java IDE (VS Code, IntelliJ, Eclipse)

### Step 1: Clone & Setup Files

```bash
# Copy .env file from template
cp .env.example .env

# Edit .env and fill in all required values
nano .env  # or use your editor
```

### Step 2: Configure Environment Variables

Edit `.env` file and add your actual credentials:

```properties
# EMAIL (Gmail SMTP with app password)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-specific-password

# CLOUDINARY (for image/video uploads)
CLOUDINARY_CLOUD=your-cloud-name
CLOUDINARY_KEY=your-key
CLOUDINARY_SECRET=your-secret

# ADMIN LOGIN (CHANGE IMMEDIATELY!)
ADMIN_EMAIL=admin@ekart.com
ADMIN_PASSWORD=Admin@123!

# API KEYS (OAuth2, Gemini)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GEMINI_API_KEY=...
```

### Step 3: Build & Run

```bash
# Build project
mvn clean install

# Run application
mvn spring-boot:run

# App will be available at: http://localhost:8080
```

---

## 📧 Email Configuration (Critical)

### Using Gmail SMTP

1. **Enable 2-Factor Authentication** on your Google Account
2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select: Mail → Windows Computer → Generate
   - Copy the 16-character password
3. **Update .env**:
   ```properties
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=your-16-char-app-password
   ```

### Test Email Sending
- Registration → Vendor OTP email will be sent
- Check console logs for errors (no OTP will print!)

---

## 🖼️ Cloudinary Configuration

### Setup Steps

1. **Create Free Account**: https://cloudinary.com/users/register/free
2. **Get Credentials**:
   - Dashboard → Account Settings
   - Cloud Name, API Key, API Secret
3. **Update .env**:
   ```properties
   CLOUDINARY_CLOUD=xxxx
   CLOUDINARY_KEY=xxxx
   CLOUDINARY_SECRET=xxxx
   ```

---

## 🔑 Default Admin Login

After first login, **IMMEDIATELY change these credentials**!

```
Email: admin@ekart.com
Password: Admin@123!  (from .env ADMIN_PASSWORD)
```

Change via: Admin Dashboard → Settings → Change Password

---

## 🔐 Security Best Practices

### ✅ Already Implemented

1. **Password Encryption** (AES)
2. **Environment Variables** for all secrets
3. **OAuth2 Social Login** (no password storage for social users)
4. **Session-based Authentication**
5. **Email Validation** (OTP verification)

### ⚠️ For Production

1. Use HTTPS only
2. Set strong `ADMIN_PASSWORD` (8+ chars, mixed case, numbers, special chars)
3. Use strong `AES_SECRET` and `AES_SALT`
4. Use production database (MySQL/PostgreSQL) instead of H2
5. Set `JPA_SHOW_SQL=false` in .env
6. Use OAuth2 for public-facing operations
7. Implement rate limiting for login attempts
8. Enable CSRF when switching to production security model

---

## 🗄️ Database Setup

### Development (H2 - File-based)
- Automatically creates `ekart_db.mv.db` file
- Data persists between restarts
- Access H2 Console: http://localhost:8080/h2-console

### Production (MySQL)
```sql
CREATE DATABASE ekart_db;
CREATE USER 'ekart_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON ekart_db.* TO 'ekart_user'@'localhost';
```

Update .env:
```properties
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/ekart_db
SPRING_DATASOURCE_USERNAME=ekart_user
SPRING_DATASOURCE_PASSWORD=strong_password
```

---

## 🧪 Testing Features

### Customer Flow
1. Go to: http://localhost:8080/
2. Register as Customer
3. Check email for OTP
4. Browse products, add to cart, checkout
5. Make payment via Razorpay (test mode)
6. Check order tracking

### Vendor Flow
1. Go to: http://localhost:8080/vendor/register
2. Verify via OTP
3. Login and add products
4. View Sales Report
5. Monitor Stock Alerts

### Admin Flow
1. Go to: http://localhost:8080/admin/login
2. Default: admin@ekart.com / Admin@123!
3. Manage users, products, content

### Stock Alert Feature
1. Add product with low stock
2. Vendor receives email alert
3. View alerts at: /stock-alerts

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Email not sending** | Check MAIL_USERNAME/PASSWORD in .env, verify Gmail app password |
| **App won't start** | Check Java version (17+), run `mvn clean install` |
| **Images not uploading** | Verify CLOUDINARY credentials |
| **H2 database error** | Delete `ekart_db.*` files and restart |
| **Port 8080 in use** | Set `SERVER_PORT=8081` in .env |

---

## 📋 Checklist Before Deployment

- [ ] All .env values filled in
- [ ] Changed Admin password from default
- [ ] Tested email sending
- [ ] Tested image uploads
- [ ] Tested payment gateway
- [ ] Tested OAuth2 logins
- [ ] Generated strong AES_SECRET and AES_SALT
- [ ] Switched to production database
- [ ] Set JPA_SHOW_SQL=false
- [ ] Deleted .env.example (never deploy with example)
- [ ] Added .env to .gitignore

---

## 📞 Support

For issues or questions, check:
- Application logs: `target/logs/` (if configured)
- Console output for error messages
- Database: http://localhost:8080/h2-console

---

**Last Updated**: March 2026
**Status**: ✅ Security Fixes Applied
