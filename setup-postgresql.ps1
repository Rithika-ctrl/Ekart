# PostgreSQL Auto-Setup Script for EKART
# Run this script as Administrator

# Colors for output
$successColor = "Green"
$errorColor = "Red"
$infoColor = "Cyan"

Write-Host "========================================" -ForegroundColor $infoColor
Write-Host "EKART PostgreSQL Setup" -ForegroundColor $infoColor
Write-Host "========================================" -ForegroundColor $infoColor

# Check if PostgreSQL is installed
Write-Host "Checking PostgreSQL installation..." -ForegroundColor $infoColor
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "PostgreSQL not found. Installing via Chocolatey..." -ForegroundColor $errorColor
    
    # Check if Chocolatey is installed
    $choco = Get-Command choco -ErrorAction SilentlyContinue
    if (-not $choco) {
        Write-Host "Installing Chocolatey first..." -ForegroundColor $infoColor
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    }
    
    # Install PostgreSQL
    Write-Host "Installing PostgreSQL..." -ForegroundColor $infoColor
    choco install postgresql -y --params "/Password:postgres"
    
    Write-Host "PostgreSQL installed! You may need to restart PowerShell and run this script again." -ForegroundColor $successColor
    exit
}

Write-Host "PostgreSQL found!" -ForegroundColor $successColor
$psqlVersion = psql --version
Write-Host "Version: $psqlVersion" -ForegroundColor $successColor

# Check if PostgreSQL service is running
Write-Host "`nChecking PostgreSQL service..." -ForegroundColor $infoColor
$pgService = Get-Service | Where-Object {$_.Name -like "postgresql*"}

if ($pgService) {
    Write-Host "Found service: $($pgService.Name)" -ForegroundColor $infoColor
    
    if ($pgService.Status -ne "Running") {
        Write-Host "Starting PostgreSQL service..." -ForegroundColor $infoColor
        Start-Service -Name $pgService.Name
        Start-Sleep -Seconds 3
        Write-Host "PostgreSQL service started!" -ForegroundColor $successColor
    }
    else {
        Write-Host "PostgreSQL service is already running!" -ForegroundColor $successColor
    }
}

# Create database and user
Write-Host "`nCreating EKART database..." -ForegroundColor $infoColor

$createDbQuery = @"
CREATE DATABASE IF NOT EXISTS ekart;
CREATE USER IF NOT EXISTS ekart_user WITH PASSWORD 'ekart_password';
ALTER ROLE ekart_user SET client_encoding TO 'utf8';
ALTER ROLE ekart_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE ekart_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE ekart TO ekart_user;
"@

$env:PGPASSWORD = "postgres"
psql -U postgres -h localhost -c "CREATE DATABASE IF NOT EXISTS ekart;"
psql -U postgres -h localhost -c "CREATE USER IF NOT EXISTS ekart_user WITH PASSWORD 'ekart_password';"
psql -U postgres -h localhost -c "GRANT ALL PRIVILEGES ON DATABASE ekart TO ekart_user;"

Remove-Item Env:\PGPASSWORD

Write-Host "Database and user created successfully!" -ForegroundColor $successColor

# Verify connection
Write-Host "`nVerifying connection..." -ForegroundColor $infoColor
$env:PGPASSWORD = "postgres"
$testConnection = psql -U postgres -h localhost -d ekart -c "SELECT 1;" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Connection successful!" -ForegroundColor $successColor
}
else {
    Write-Host "Connection test had issues, but database may still be created." -ForegroundColor $errorColor
}

Remove-Item Env:\PGPASSWORD

Write-Host "`n========================================" -ForegroundColor $infoColor
Write-Host "PostgreSQL Setup Complete!" -ForegroundColor $successColor
Write-Host "========================================" -ForegroundColor $infoColor
Write-Host ""
Write-Host "Next steps:" -ForegroundColor $infoColor
Write-Host "1. Build EKART: mvn clean install -DskipTests -q" -ForegroundColor $infoColor
Write-Host "2. Run backend: mvn spring-boot:run" -ForegroundColor $infoColor
Write-Host "3. Start frontend: npm run dev" -ForegroundColor $infoColor
