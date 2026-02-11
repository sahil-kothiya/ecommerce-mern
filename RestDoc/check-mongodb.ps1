# MongoDB Quick Start
# After installing MongoDB, run this script to check and start the service

$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue

if ($mongoService) {
    Write-Host "✓ MongoDB service found!" -ForegroundColor Green
    
    if ($mongoService.Status -eq "Running") {
        Write-Host "✓ MongoDB is already running!" -ForegroundColor Green
    } else {
        Write-Host "Starting MongoDB service..." -ForegroundColor Yellow
        Start-Service -Name MongoDB
        Start-Sleep -Seconds 2
        Write-Host "✓ MongoDB started successfully!" -ForegroundColor Green
    }
    
    Write-Host "`nMongoDB Status:" -ForegroundColor Cyan
    Get-Service -Name MongoDB | Format-Table -AutoSize
    
    Write-Host "`nVerifying connection..." -ForegroundColor Cyan
    $listening = netstat -an | Select-String "27017"
    if ($listening) {
        Write-Host "✓ MongoDB is listening on port 27017" -ForegroundColor Green
    } else {
        Write-Host "⚠ MongoDB may not be listening yet, wait a few seconds" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ MongoDB service not found!" -ForegroundColor Red
    Write-Host "`nPlease install MongoDB from:" -ForegroundColor Yellow
    Write-Host "https://www.mongodb.com/try/download/community" -ForegroundColor Cyan
    Write-Host "`nAfter installation, run this script again." -ForegroundColor Yellow
}
