#!/usr/bin/env pwsh

$backendPath = "C:\Users\whynew.in\OneDrive\Desktop\EKART\EKART"
$port = 9000

Write-Host "Starting EKART Backend..." -ForegroundColor Cyan
Write-Host "Path: $backendPath"
Write-Host "Port: $port`n"

# Start Maven in a background process using Start-Process
$process = Start-Process `
    -FilePath "cmd" `
    -ArgumentList "/c", "cd $backendPath && mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=$port" `
    -NoNewWindow `
    -PassThru `
    -RedirectStandardOutput "$backendPath\..\backend-output.log" `
    -RedirectStandardError "$backendPath\..\backend-error.log"

Write-Host "Backend process started with PID: $($process.Id)"
Write-Host "Waiting 20 seconds for backend to initialize...`n"

# Wait and check if process is still running
for ($i = 1; $i -le 20; $i++) {
    Start-Sleep -Seconds 1
    Write-Host "." -NoNewline
}

Write-Host "`n"

# Check if port is open
$port_check = netstat -ano 2>$null | Select-String ":$port"
if ($port_check) {
    Write-Host "✓ Backend is running on port $port" -ForegroundColor Green
    Write-Host "  Available at: http://localhost:$port`n" -ForegroundColor Green
} else {
    Write-Host "✗ Backend not responding on port $port" -ForegroundColor Red
    Write-Host "  Check logs at: $backendPath\..\ backend-output.log`n" -ForegroundColor Red
    exit 1
}
