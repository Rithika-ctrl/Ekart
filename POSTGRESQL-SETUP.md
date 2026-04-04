# PostgreSQL Setup Guide for EKART

## Step 1: Install PostgreSQL

### Option A: Using Chocolatey (Windows)
```powershell
# Install PostgreSQL (default latest version)
choco install postgresql --version=15.0

# During installation, set password for 'postgres' user
# Default setup creates user: postgres with password you choose
```

### Option B: Download Installer
1. Visit: https://www.postgresql.org/download/windows/
2. Download PostgreSQL installer (14+ recommended)
3. Run installer and remember the password for 'postgres' user
4. Default port: 5432

### Option C: Using Windows Package Manager
```powershell
winget install PostgreSQL.PostgreSQL
```

---

## Step 2: Add PostgreSQL to PATH (if not auto-added)

Add PostgreSQL bin folder to your system PATH:
- Default path: `C:\Program Files\PostgreSQL\15\bin`

**Verify installation:**
```powershell
psql --version
```

---

## Step 3: Start PostgreSQL Service

### Check Service Status:
```powershell
# List PostgreSQL services
Get-Service | findstr postgres

# Start PostgreSQL
Start-Service -Name "postgresql-x64-15"
# (Version number may vary)
```

### Or use pgAdmin (GUI):
- pgAdmin typically auto-starts with PostgreSQL installation
- Access at: http://localhost:5050

---

## Step 4: Create Database & User

### Connect to PostgreSQL:
```powershell
psql -U postgres
```
Enter password when prompted.

### Create Database and User:
```sql
-- Create database
CREATE DATABASE ekart;

-- Create application user
CREATE USER ekart_user WITH PASSWORD 'ekart_password';

-- Grant privileges
ALTER ROLE ekart_user SET client_encoding TO 'utf8';
ALTER ROLE ekart_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE ekart_user SET default_transaction_deferrable TO on;
ALTER ROLE ekart_user CREATEDB;

-- Grant all privileges on ekart database
GRANT ALL PRIVILEGES ON DATABASE ekart TO ekart_user;

-- Exit psql
\q
```

---

## Step 5: Update EKART Application Configuration

### Option A: Local Development (Current Settings)
File: `EKART/src/main/resources/application.properties`

**Already configured for default PostgreSQL:**
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/ekart
spring.datasource.username=postgres
spring.datasource.password=postgres
```

### Option B: Production Setup
Update the credentials as per your setup:
```properties
spring.datasource.url=jdbc:postgresql://HOST:PORT/ekart
spring.datasource.username=ekart_user
spring.datasource.password=ekart_password
```

---

## Step 6: Build and Run Application

```powershell
cd C:\Users\whynew.in\OneDrive\Desktop\EKART\EKART

# Build backend (will create tables automatically)
mvn clean install -DskipTests -q

# Start backend (Hibernate will create schema from entities)
mvn spring-boot:run
```

**What happens:**
- Spring Boot connects to PostgreSQL
- Hibernate reads all 27 @Entity classes
- Generates SQL CREATE TABLE statements
- Creates all tables and relationships automatically

---

## Step 7: Verify Database Creation

### Connect to PostgreSQL:
```powershell
psql -U postgres -d ekart
```

### List all tables:
```sql
\dt
```

### View specific table:
```sql
\d table_name
```

### Exit:
```sql
\q
```

---

## React Frontend Configuration

The React API is already configured to connect to the Java backend:
- File: `ekart-frontend/src/api.js`
- API Base: `http://localhost:8080/api/react`
- Backend handles all database operations

---

## Troubleshooting

### Connection Refused?
```powershell
# Check if PostgreSQL is running
Get-Service | findstr postgres

# Start it
Start-Service -Name "postgresql-x64-15"
```

### "password authentication failed"?
- Ensure username and password match what was set during creation
- Check application.properties has correct credentials

### "database does not exist"?
```powershell
psql -U postgres -c "CREATE DATABASE ekart;"
```

### Tables not created automatically?
1. Check `application.properties` has `spring.jpa.hibernate.ddl-auto=create`
2. View logs during startup for SQL errors
3. Ensure all entity classes have `@Entity` annotation

---

## Database Schema Summary

**27 JPA Entities** (auto-created tables):
- Banner, Address, AutoAssignLog, BackInStockSubscription
- Cart, Category, Coupon, Customer
- DeliveryBoy, DeliveryOtp, Item, Order
- Product, Refund, RefundImage, Review
- ReviewImage, SalesReport, StockAlert, TrackingEventLog
- UserActivity, Vendor, Warehouse, WarehouseChangeRequest
- Wishlist, Policy, SalesRecord

All tables are automatically created from Java entity definitions with proper:
- Primary keys
- Foreign key relationships
- Indexes
- Constraints

---

## Quick Start Command

After PostgreSQL is installed and running:
```powershell
cd C:\Users\whynew.in\OneDrive\Desktop\EKART\EKART
mvn clean install -DskipTests -q
mvn spring-boot:run
```

Your EKART application will start on `http://localhost:8080`
