# Email & SMS Setup Guide for EKART

## Part 1: Gmail Email Setup

### Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/
2. Select **Security** from the left menu
3. Enable **2-Step Verification**

### Step 2: Create App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select **Mail** and **Windows Computer** (or your device)
3. Google will generate a **16-character password**
4. Copy this password - **this is your MAIL_PASSWORD**

### Step 3: Update Environment Variables

**Option A: Windows Environment Variables (Permanent)**
```powershell
# Run as Administrator
[Environment]::SetEnvironmentVariable("MAIL_USERNAME", "your-email@gmail.com", "User")
[Environment]::SetEnvironmentVariable("MAIL_PASSWORD", "your-app-password", "User")
```

**Option B: Create .env file in EKART folder**
```
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password-16chars
```

**Option C: Update application.properties directly (Not Recommended for Production)**
```properties
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password
spring.mail.from=your-email@gmail.com
```

### Step 4: Test Email Service

The email service will automatically send emails for:
- ✅ User registration confirmation
- ✅ Password reset links
- ✅ Order confirmation
- ✅ Refund notifications
- ✅ Back in stock alerts

---

## Part 2: Twilio SMS Integration

### Step 1: Create Twilio Account
1. Go to https://www.twilio.com/
2. Click **Sign Up** (free trial available)
3. Verify your email and phone number
4. Create a project

### Step 2: Get Twilio Credentials
1. Go to https://console.twilio.com/
2. Copy your **Account SID** and **Auth Token**
3. Buy a **Twilio Phone Number** (cost: $1-3/month)
   - Choose any number (e.g., +1 503 000 1234)

### Step 3: Update Environment Variables

**Windows (Permanent):**
```powershell
[Environment]::SetEnvironmentVariable("TWILIO_ACCOUNT_SID", "your-account-sid", "User")
[Environment]::SetEnvironmentVariable("TWILIO_AUTH_TOKEN", "your-auth-token", "User")
[Environment]::SetEnvironmentVariable("TWILIO_PHONE_NUMBER", "+1503...", "User")
[Environment]::SetEnvironmentVariable("SMS_ENABLED", "true", "User")
```

**Or in .env file:**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+15030001234
SMS_ENABLED=true
```

### Step 4: Example Usage in Code

**Inject SMS Service:**
```java
@Autowired
private SmsService smsService;

// Send OTP
smsService.sendOtp("9876543210", "123456");

// Send delivery notification
smsService.sendDeliveryNotification("9876543210", "ORD-001", "Out for Delivery");

// Send order status
smsService.sendOrderStatusUpdate("9876543210", "ORD-001", "Confirmed");
```

---

## Part 3: Configure Email in Application

### File: `application.properties`

**Current Configuration:**
```properties
# ===============================
# EMAIL CONFIG (Gmail SMTP)
# ===============================
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=${MAIL_USERNAME:sanjay.e9848@gmail.com}
spring.mail.password=${MAIL_PASSWORD:your-app-password}
spring.mail.from=${MAIL_USERNAME:sanjay.e9848@gmail.com}
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true

# ===============================
# SMS CONFIG (Twilio)
# ===============================
twilio.account-sid=${TWILIO_ACCOUNT_SID:}
twilio.auth-token=${TWILIO_AUTH_TOKEN:}
twilio.phone-number=${TWILIO_PHONE_NUMBER:+1234567890}
sms.enabled=${SMS_ENABLED:false}
```

---

## Part 4: Using Environment Variables

### When Running Application:

**Option 1: Set env vars before running**
```powershell
$env:MAIL_USERNAME="your-email@gmail.com"
$env:MAIL_PASSWORD="app-password"
$env:TWILIO_ACCOUNT_SID="ACxxxxxxx"
$env:TWILIO_AUTH_TOKEN="token"
$env:TWILIO_PHONE_NUMBER="+1503000"
$env:SMS_ENABLED="true"

java -jar target/ekart-0.0.1-SNAPSHOT.jar
```

**Option 2: Using application-prod.properties**

Create file: `src/main/resources/application-prod.properties`
```properties
spring.mail.username=prod-email@gmail.com
spring.mail.password=prod-app-password
twilio.account-sid=ACxxxxxxx
twilio.auth-token=token
twilio.phone-number=+15030001234
sms.enabled=true
```

Run with profile:
```powershell
java -jar target/ekart-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

---

## Part 5: Troubleshooting

### Emails Not Sending?

**Check 1: Gmail App Password**
- Did you create a 16-character app password (not your regular password)?
- Is 2-factor authentication enabled?

**Check 2: Less Secure Apps**
- Gmail requires either:
  - App password (recommended), OR
  - Allow less secure apps (older method)

**Check 3: Verify Credentials**
```properties
# Test these are set correctly
spring.mail.username=your-exact-email@gmail.com
spring.mail.password=your-16-char-app-password
```

**Check 4: Check Application Logs**
```
Look for: "Mail send successful" or error messages
```

---

### SMS Not Sending?

**Check 1: Twilio Account Active**
- Trial account? Ensure you verified your phone
- Sufficient credits? (Trial gives $15 free)

**Check 2: Phone Number Format**
- Must be: +91 for India, +1 for USA
- Example: +919876543210

**Check 3: SMS Enabled?**
```properties
sms.enabled=true
```

**Check 4: Credentials Correct?**
- Copy directly from Twilio console
- No spaces or extra characters

---

## Part 6: Production Checklist

- [ ] Email configured with production Gmail account
- [ ] App password created (not regular password)
- [ ] Twilio account created and funded
- [ ] Twilio credentials stored securely (environment variables)
- [ ] SMS enabled only if needed (to avoid costs)
- [ ] Test email sending: Try registration
- [ ] Test SMS sending: Try order notification
- [ ] Monitor email/SMS logs for errors

---

## Part 7: Cost Estimation

### Gmail
- **Free** (no cost for SMTP)

### Twilio SMS
- **Trial:** $15 free credits
- **Production:** $0.0075 per SMS (approximately 5-10 rupees in India)
- **Phone Number:** $1-3 per month

---

## Part 8: Alternative SMS Providers

If Twilio doesn't work for you:

### AWS SNS
```xml
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>sns</artifactId>
</dependency>
```

### Nexmo (Vonage)
```xml
<dependency>
    <groupId>com.vonage</groupId>
    <artifactId>client</artifactId>
</dependency>
```

### 2Factor.in (Popular in India)
```
API: https://2factor.in/API/V1/
Cost: ₹0.3 per SMS
```

---

## Quick Start (5 Minutes)

### For Gmail Email:
1. Get app password from myaccount.google.com/apppasswords
2. Set environment variable: `MAIL_USERNAME` and `MAIL_PASSWORD`
3. Restart backend
4. Try registration - you'll get confirmation email

### For Twilio SMS:
1. Create account at twilio.com
2. Buy phone number
3. Get Account SID and Auth Token
4. Set environment variables: `TWILIO_*` and `SMS_ENABLED=true`
5. Restart backend
6. SMS will send on order confirmations/updates

**That's it! Email and SMS will now work!** 🚀
