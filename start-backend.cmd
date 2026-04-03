@echo off
REM Simple backend startup script

cd /d "C:\Users\whynew.in\OneDrive\Desktop\EKART\EKART"

echo.
echo ╔════════════════════════════════════════════╗
echo ║   Starting EKART Backend on Port 9000    ║
echo ╚════════════════════════════════════════════╝
echo.

REM Start Maven
echo Starting Maven Spring Boot application...
call mvn spring-boot:run "-Dspring-boot.run.arguments=--server.port=9000"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error: Backend failed to start
    echo Check the output above for details
    pause
    exit /b 1
)
