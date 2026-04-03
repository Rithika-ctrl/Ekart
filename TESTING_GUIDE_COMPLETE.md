# EKART Complete E2E Testing Guide

## Prerequisites
- Java/JDK installed
- Maven installed  
- Both ports 9000 and 3001 available

## Step 1: Start Backend (Port 9000)

### Option A: Using PowerShell
```powershell
cd C:\Users\whynew.in\OneDrive\Desktop\EKART\EKART
mvn clean install -DskipTests
mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=9000
```

### Option B: Using Command Prompt
```batch
cd C:\Users\whynew.in\OneDrive\Desktop\EKART\EKART
mvn clean install -DskipTests
mvn spring-boot:run "-Dspring-boot.run.arguments=--server.port=9000"
```

**Wait for message: "Started Application in X.XXX seconds"**

Normal initialization takes 30-60 seconds depending on system.

---

## Step 2: Start Frontend (Port 3001)

### In a NEW terminal/PowerShell window:
```powershell
cd C:\Users\whynew.in\OneDrive\Desktop\EKART\ekart-frontend
npm install  # If not already done
npm run dev
```

*Frontend will be available at: `http://localhost:3001`*

---

## Step 3: Run E2E Tests

### After both backend and frontend are running:

**Option A: Using PowerShell Script**
```powershell
cd C:\Users\whynew.in\OneDrive\Desktop\EKART
powershell -ExecutionPolicy Bypass -File test-e2e.ps1
```

**Option B: Using curl in Command Prompt**
```batch
cd C:\Users\whynew.in\OneDrive\Desktop\EKART
REM Test backend health
curl http://localhost:9000/products/all

REM Test customer registration
curl -X POST http://localhost:9000/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test\",\"email\":\"test@mail.com\",\"password\":\"Pass@1234\",\"mobile\":\"9876543210\",\"provider\":\"LOCAL\",\"role\":\"CUSTOMER\"}"
```

---

## Test Coverage

### 11 Total Users:
- **5 Customers** (cust1@test.com - cust5@test.com)
- **3 Vendors** (vendor1@test.com - vendor3@test.com)
- **2 Delivery Boys** (dboy1@test.com - dboy2@test.com)
- **1 Admin** (admin@ekart.com - for role-based testing)

### API Endpoints Tested:
- `POST /auth/signup` - User registration
- `POST /auth/login` - User authentication
- `GET /products/all` - Product listing

---

## Backend Log Output Examples

### Success Indicators:
```
[OK] Customer 1 registered
[OK] Vendor 1 registered 
[OK] Delivery Boy 1 registered
[OK] Products endpoint: 15 products found
[OK] Admin login successful
```

### What Success Looks Like:
```
Success Rate: 100%
Total Users Registered: 10 / 10
  - Customers: 5 / 5
  - Vendors: 3 / 3
  - Delivery Boys: 2 / 2
  
Status: [✓ READY FOR PRODUCTION]
```

---

## Troubleshooting

### Port Already in Use
```batch
REM Find process using port 9000
netstat -ano | find ":9000"

REM Kill process (replace XXXX with PID)
taskkill /PID XXXX /F
```

### Backend Initialization Timeout
- Normal startup: 30-60 seconds
- If taking longer: Check Java & Maven are installed
- Check `target/classes` exists after Maven build

### Database Connection Issues
- Check `application.properties` in EKART/src/main/resources/
- Default H2 database: `jdbc:h2:mem:ekartdb`
- If using external DB: Verify connection string & credentials

### API Returns 404/401
- Verify backend is running: `curl http://localhost:9000/health`
- Check all endpoints use correct port: 9000 (NOT 8080)
- Verify JSON format in request bodies

---

## Performance Metrics

### Expected Response Times:
- Signup: < 500ms
- Login: < 300ms
- Product List: < 200ms

### System Requirements for Full Load:
- Minimum 4GB RAM for both services
- CPU: Multi-core recommended
- Disk: 500MB free space

---

## Quick Test (Without Frontend)

Minimal smoke test to verify backend:
```powershell
# 1. Only start backend
# 2. Wait for "Started Application" message
# 3. Test one endpoint:
Invoke-RestMethod -Uri "http://localhost:9000/products/all" -Method Get
```

If this returns data, backend is functioning correctly.
