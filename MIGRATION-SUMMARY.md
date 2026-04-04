# EKART Migration: MySQL → PostgreSQL

## Summary of Changes

### 1. **Database Configuration Updated**
**File:** `EKART/src/main/resources/application.properties`

**Changes:**
- ❌ Removed: TiDB Cloud MySQL configuration
  - URL: `jdbc:mysql://gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test`
  - Driver: `com.mysql.cj.jdbc.Driver`
  - Dialect: `MySQLDialect`

- ✅ Added: PostgreSQL Local Configuration
  - URL: `jdbc:postgresql://localhost:5432/ekart`
  - Driver: `org.postgresql.Driver`
  - Dialect: `PostgreSQLDialect`
  - DDL Strategy: `create` (auto-creates schema from entities)

**Default Credentials:**
```properties
spring.datasource.username=postgres
spring.datasource.password=postgres
```

---

### 2. **Maven Dependencies Updated**
**File:** `EKART/pom.xml`

**Changes:**
- ❌ Removed: MySQL JDBC Driver
  ```xml
  <groupId>com.mysql</groupId>
  <artifactId>mysql-connector-j</artifactId>
  ```

- ✅ Added: PostgreSQL JDBC Driver
  ```xml
  <groupId>org.postgresql</groupId>
  <artifactId>postgresql</artifactId>
  ```

---

### 3. **Database Schema Generation**

**Hibernate Configuration:**
- `spring.jpa.hibernate.ddl-auto=create`
- On first run, Hibernate will:
  1. Read all 27 JPA @Entity classes
  2. Generate SQL CREATE TABLE statements
  3. Execute DDL to create all tables

**27 Auto-Generated Tables:**
```
1. Banner
2. Address
3. AutoAssignLog
4. BackInStockSubscription
5. Cart
6. Category
7. Coupon
8. Customer
9. DeliveryBoy
10. DeliveryOtp
11. Item
12. Order (Entity: shopping_order)
13. Product
14. Refund
15. RefundImage
16. Review
17. ReviewImage
18. SalesReport
19. StockAlert
20. TrackingEventLog
21. UserActivity
22. Vendor
23. Warehouse
24. WarehouseChangeRequest
25. Wishlist
26. Policy
27. SalesRecord
```

---

### 4. **Database Architecture**

**Previous (MySQL):**
```
React Frontend ──> Java Backend ──> TiDB Cloud MySQL (Singapore)
```

**New (PostgreSQL):**
```
React Frontend ──> Java Backend ──> PostgreSQL (Local/Remote)
                   └─ Java Entities
                   └─ Auto DDL Generation
```

---

### 5. **React Frontend Configuration**

**Status:** ✅ No Changes Required
- File: `ekart-frontend/src/api.js`
- Frontend connects to: `http://localhost:8080/api/react`
- Backend handles all database operations
- React doesn't directly access database

---

## Setup Instructions

### Quick Setup (Automated)
```powershell
# Run PostgreSQL setup script (requires Admin)
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser
.\setup-postgresql.ps1
```

### Manual Setup

1. **Install PostgreSQL:**
   ```powershell
   choco install postgresql
   ```

2. **Create Database:**
   ```powershell
   psql -U postgres
   
   # In psql:
   CREATE DATABASE ekart;
   ```

3. **Build Application:**
   ```powershell
   cd EKART
   mvn clean install -DskipTests -q
   ```

4. **Run Application:**
   ```powershell
   mvn spring-boot:run
   # Tables auto-create on startup
   ```

5. **Start Frontend:**
   ```powershell
   cd ..\ekart-frontend
   npm run dev
   ```

---

## Benefits of PostgreSQL

| Feature | MySQL (TiDB) | PostgreSQL |
|---------|--------------|------------|
| **Setup** | Cloud Account Required | Local/Easy Install |
| **Cost** | Paid Service | Free & Open Source |
| **Network** | Cloud Dependency | Local/Fast |
| **Development** | Slower for Local Dev | Instant Local Dev |
| **Data Types** | Basic | Advanced (JSON, Arrays, etc.) |
| **Transactions** | Good | Excellent (ACID) |
| **Full-Text Search** | No | Yes (with extensions) |

---

## Connection String Examples

### Local Development (Current)
```
jdbc:postgresql://localhost:5432/ekart
```

### Production Remote Server
```
jdbc:postgresql://db.example.com:5432/ekart
```

### Docker PostgreSQL
```
jdbc:postgresql://postgres:5432/ekart
```

### Update credentials in `application.properties`:
```properties
spring.datasource.username=your_user
spring.datasource.password=your_password
```

---

## Reverting to Previous Configuration

**To revert to MySQL TiDB Cloud:**

1. Update `pom.xml` - add MySQL driver back
2. Update `application.properties` - restore TiDB URL and credentials
3. Rebuild project

---

## Support Files

- **Setup Guide:** `POSTGRESQL-SETUP.md`
- **Setup Script:** `setup-postgresql.ps1`
- **Config File:** `application.properties`

For detailed PostgreSQL installation steps, see `POSTGRESQL-SETUP.md`
