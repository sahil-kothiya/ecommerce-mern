$baseUrl = "http://localhost:5001"

Write-Host "🧪 Testing API endpoints..." -ForegroundColor Cyan
Write-Host ""

try {
    # Test Products endpoint
    Write-Host "📦 Testing Products API..." -ForegroundColor Yellow
    $productsResponse = Invoke-RestMethod -Uri "$baseUrl/api/products?limit=3" -Method Get -ContentType "application/json"
    Write-Host "Status: Success" -ForegroundColor Green
    if ($productsResponse.success) {
        Write-Host "Found $($productsResponse.products.Count) products" -ForegroundColor Green
        Write-Host "Total available: $($productsResponse.total)" -ForegroundColor Green
        if ($productsResponse.products.Count -gt 0) {
            Write-Host "First product: $($productsResponse.products[0].name)" -ForegroundColor Green
        }
    } else {
        Write-Host "Response: $($productsResponse | ConvertTo-Json -Depth 2)" -ForegroundColor Red
    }
    Write-Host ""
    
    # Test Categories endpoint
    Write-Host "📂 Testing Categories API..." -ForegroundColor Yellow
    $categoriesResponse = Invoke-RestMethod -Uri "$baseUrl/api/categories" -Method Get -ContentType "application/json"
    Write-Host "Status: Success" -ForegroundColor Green
    if ($categoriesResponse.success) {
        Write-Host "Found $($categoriesResponse.categories.Count) categories" -ForegroundColor Green
        if ($categoriesResponse.categories.Count -gt 0) {
            Write-Host "First category: $($categoriesResponse.categories[0].name)" -ForegroundColor Green
        }
    } else {
        Write-Host "Response: $($categoriesResponse | ConvertTo-Json -Depth 2)" -ForegroundColor Red
    }
    Write-Host ""
    
    # Test Brands endpoint
    Write-Host "🏷️  Testing Brands API..." -ForegroundColor Yellow
    $brandsResponse = Invoke-RestMethod -Uri "$baseUrl/api/brands" -Method Get -ContentType "application/json"
    Write-Host "Status: Success" -ForegroundColor Green
    if ($brandsResponse.success) {
        Write-Host "Found $($brandsResponse.brands.Count) brands" -ForegroundColor Green
        if ($brandsResponse.brands.Count -gt 0) {
            Write-Host "First brand: $($brandsResponse.brands[0].name)" -ForegroundColor Green
        }
    } else {
        Write-Host "Response: $($brandsResponse | ConvertTo-Json -Depth 2)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "✅ API testing completed!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error testing API: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press Enter to continue..." -ForegroundColor Gray
Read-Host