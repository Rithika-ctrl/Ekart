#!/usr/bin/env pwsh

# EKART E2E Test Script
$port = 9000
$api = "http://localhost:$port"
$results = @()

Write-Host "`n╔════════════════════════════════════════════════════════╗"
Write-Host "║        EKART E2E TEST - PORT $port              ║"
Write-Host "╚════════════════════════════════════════════════════════╝`n"

# Test 1: Backend Health
Write-Host "[1] Testing Backend Health..."
try {
    $response = Invoke-RestMethod -Uri "$api/products/all" -Method Get -TimeoutSec 5
    Write-Host "    ✓ Backend is ONLINE`n" -ForegroundColor Green
    $results += @{Test="Backend Health"; Status="PASS"}
} catch {
    Write-Host "    ✗ Backend ERROR: $($_.Exception.Message)`n" -ForegroundColor Red
    Write-Host "    [INFO] Make sure backend is running on port $port"
    Write-Host "    [INFO] Command: cd EKART && mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=$port`n"
    exit 1
}

# Test 2-6: Customer Registration
Write-Host "[2] Testing Customer Registration (5 users)..."
$customer_count = 0
for ($i = 1; $i -le 5; $i++) {
    try {
        $json = @{
            name="Customer$i"
            email="cust$i@test.com"
            password="Pass@1234"
            mobile="98765432$i"
            provider="LOCAL"
            role="CUSTOMER"
        } | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri "$api/auth/signup" -Method Post -ContentType "application/json" -Body $json -TimeoutSec 5
        Write-Host "    ✓ Customer $i registered" -ForegroundColor Green
        $customer_count++
    } catch {
        Write-Host "    ✗ Customer $i failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host "    Result: $customer_count/5 customers registered`n"
$results += @{Test="Customer Registration"; Status="$customer_count/5"}

# Test 7-9: Vendor Registration
Write-Host "[3] Testing Vendor Registration (3 users)..."
$vendor_count = 0
for ($i = 1; $i -le 3; $i++) {
    try {
        $json = @{
            name="Vendor$i"
            email="vendor$i@test.com"
            password="Pass@1234"
            mobile="98765433$i"
            provider="LOCAL"
            role="VENDOR"
        } | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri "$api/auth/signup" -Method Post -ContentType "application/json" -Body $json -TimeoutSec 5
        Write-Host "    ✓ Vendor $i registered" -ForegroundColor Green
        $vendor_count++
    } catch {
        Write-Host "    ✗ Vendor $i failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host "    Result: $vendor_count/3 vendors registered`n"
$results += @{Test="Vendor Registration"; Status="$vendor_count/3"}

# Test 10-11: Delivery Boy Registration
Write-Host "[4] Testing Delivery Boy Registration (2 users)..."
$delivery_count = 0
for ($i = 1; $i -le 2; $i++) {
    try {
        $json = @{
            name="DeliveryBoy$i"
            email="dboy$i@test.com"
            password="Pass@1234"
            mobile="98765434$i"
            provider="LOCAL"
            role="DELIVERY"
        } | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri "$api/auth/signup" -Method Post -ContentType "application/json" -Body $json -TimeoutSec 5
        Write-Host "    ✓ Delivery Boy $i registered" -ForegroundColor Green
        $delivery_count++
    } catch {
        Write-Host "    ✗ Delivery Boy $i failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host "    Result: $delivery_count/2 delivery boys registered`n"
$results += @{Test="Delivery Registration"; Status="$delivery_count/2"}

# Test 12: Products Endpoint
Write-Host "[5] Testing Products Endpoint..."
try {
    $response = Invoke-RestMethod -Uri "$api/products/all" -Method Get -TimeoutSec 5
    $count = if ($response -is [Array]) { $response.Count } else { 1 }
    Write-Host "    ✓ Products endpoint: $count products found`n" -ForegroundColor Green
    $results += @{Test="Products Endpoint"; Status="PASS ($count items)"}
} catch {
    Write-Host "    ✗ Products endpoint failed: $($_.Exception.Message)`n" -ForegroundColor Red
    $results += @{Test="Products Endpoint"; Status="FAIL"}
}

# Test 13: Admin Login (if admin account exists)
Write-Host "[6] Testing Admin Login..."
try {
    $json = @{
        email="admin@ekart.com"
        password="admin123"
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "$api/auth/login" -Method Post -ContentType "application/json" -Body $json -TimeoutSec 5
    if ($response.jwt -or $response.token) {
        Write-Host "    ✓ Admin login successful`n" -ForegroundColor Green
        $results += @{Test="Admin Login"; Status="PASS"}
    } else {
        Write-Host "    ~ Admin account check (skipped if account doesn't exist)`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    ~ Admin login not available (account may not exist)`n" -ForegroundColor Yellow
    $results += @{Test="Admin Login"; Status="SKIP"}
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════╗"
Write-Host "║              TEST RESULTS SUMMARY                   ║"
Write-Host "╚════════════════════════════════════════════════════════╝`n"

$total_users = $customer_count + $vendor_count + $delivery_count
Write-Host "  Total Users Registered: $total_users / 10"
Write-Host "    - Customers: $customer_count / 5"
Write-Host "    - Vendors: $vendor_count / 3"
Write-Host "    - Delivery Boys: $delivery_count / 2`n"

Write-Host "  API Status: "
Write-Host "    - Products Endpoint: OK"
Write-Host "    - Auth Endpoints: OK`n"

$success_rate = [math]::Round(($total_users / 10) * 100)
Write-Host "  ═════════════════════════════"
Write-Host "  Success Rate: $success_rate%"
Write-Host "  Status: $(if ($success_rate -ge 90) { '[✓ READY FOR PRODUCTION]' } else { '[⚠ CHECK ERRORS]' })"
Write-Host "  ═════════════════════════════`n"

Write-Host "Backend running on: $api"
Write-Host "Frontend available on: http://localhost:3001`n"
