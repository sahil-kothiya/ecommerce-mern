# ==============================================================================
# Enterprise E-Commerce - Development Server Startup Script
# ==============================================================================
# This script starts both backend and frontend servers simultaneously
# Author: Enterprise E-Commerce Team
# Date: February 12, 2026
# ==============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Enterprise E-Commerce Platform" -ForegroundColor Yellow
Write-Host " Development Server Startup" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "[1/5] Checking Node.js installation..." -ForegroundColor Blue
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found!" -ForegroundColor Red
    Write-Host "  Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if MongoDB is running
Write-Host ""
Write-Host "[2/5] Checking MongoDB connection..." -ForegroundColor Blue
try {
    $mongoProcess = Get-Process -Name mongod -ErrorAction SilentlyContinue
    if ($mongoProcess) {
        Write-Host "  ✓ MongoDB is running (PID: $($mongoProcess.Id))" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ MongoDB may not be running" -ForegroundColor Yellow
        Write-Host "  Starting MongoDB service..." -ForegroundColor Yellow
        
        try {
            Start-Service MongoDB -ErrorAction SilentlyContinue
            Write-Host "  ✓ MongoDB service started" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠ Could not start MongoDB service" -ForegroundColor Yellow
            Write-Host "  Please start MongoDB manually: mongod" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  ⚠ Could not verify MongoDB status" -ForegroundColor Yellow
}

# Kill any existing node processes on ports 5001 and 5173
Write-Host ""
Write-Host "[3/5] Checking for existing servers..." -ForegroundColor Blue

# Check port 5001 (Backend)
$port5001 = netstat -ano | findstr :5001 | Select-String "LISTENING"
if ($port5001) {
    Write-Host "  Found server on port 5001, stopping..." -ForegroundColor Yellow
    $pid = ($port5001 -split '\s+')[-1]
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Stopped server on port 5001" -ForegroundColor Green
    Start-Sleep -Seconds 1
}

# Check port 5173 (Frontend)
$port5173 = netstat -ano | findstr :5173 | Select-String "LISTENING"
if ($port5173) {
    Write-Host "  Found server on port 5173, stopping..." -ForegroundColor Yellow
    $pid = ($port5173 -split '\s+')[-1]
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Stopped server on port 5173" -ForegroundColor Green
    Start-Sleep -Seconds 1
}

# Get current directory
$rootDir = Get-Location
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"

# Verify directories exist
if (-not (Test-Path $backendDir)) {
    Write-Host ""
    Write-Host "  ✗ Backend directory not found!" -ForegroundColor Red
    Write-Host "  Expected: $backendDir" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $frontendDir)) {
    Write-Host ""
    Write-Host "  ✗ Frontend directory not found!" -ForegroundColor Red
    Write-Host "  Expected: $frontendDir" -ForegroundColor Yellow
    exit 1
}

# Start Backend Server
Write-Host ""
Write-Host "[4/5] Starting Backend API Server..." -ForegroundColor Blue
Write-Host "  Location: $backendDir" -ForegroundColor Gray
Write-Host "  Port: 5001" -ForegroundColor Gray

$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; Write-Host 'Backend API Server' -ForegroundColor Cyan; npm run dev" -PassThru
Write-Host "  ✓ Backend server started (PID: $($backendProcess.Id))" -ForegroundColor Green
Write-Host "  📡 API: http://localhost:5001" -ForegroundColor Cyan

# Wait a moment for backend to initialize
Start-Sleep -Seconds 3

# Start Frontend Server
Write-Host ""
Write-Host "[5/5] Starting Frontend Development Server..." -ForegroundColor Blue
Write-Host "  Location: $frontendDir" -ForegroundColor Gray
Write-Host "  Port: 5173" -ForegroundColor Gray

$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; Write-Host 'Frontend Development Server' -ForegroundColor Cyan; npm run dev" -PassThru
Write-Host "  ✓ Frontend server started (PID: $($frontendProcess.Id))" -ForegroundColor Green
Write-Host "  🌐 App: http://localhost:5173" -ForegroundColor Cyan

# Display summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " 🎉 Development Servers Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend API:  http://localhost:5001" -ForegroundColor Yellow
Write-Host "  Frontend App: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Backend PID:  $($backendProcess.Id)" -ForegroundColor Gray
Write-Host "  Frontend PID: $($frontendProcess.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "Quick Access:" -ForegroundColor Cyan
Write-Host "  • Health Check: http://localhost:5001/health" -ForegroundColor Gray
Write-Host "  • Admin Login:  admin@admin.com / password123" -ForegroundColor Gray
Write-Host "  • User Login:   user@admin.com / password123" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop servers:" -ForegroundColor Yellow
Write-Host "  • Close the terminal windows, or" -ForegroundColor Gray
Write-Host "  • Press Ctrl+C in each terminal" -ForegroundColor Gray
Write-Host ""
Write-Host "Happy Coding! 🚀" -ForegroundColor Green
Write-Host ""
