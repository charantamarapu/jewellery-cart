#!/usr/bin/env pwsh
# Comprehensive debugging and testing script for Jewellery Cart

$ErrorActionPreference = "SilentlyContinue"

# Colors for output
function Write-Section { Write-Host "`n========================================" -ForegroundColor Cyan; Write-Host "  $args " -ForegroundColor Cyan; Write-Host "========================================" -ForegroundColor Cyan }
function Write-Pass { Write-Host "[PASS] $args" -ForegroundColor Green }
function Write-Fail { Write-Host "[FAIL] $args" -ForegroundColor Red }
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Yellow }

# Test Backend
Write-Section "BACKEND TESTS"

# Test 1: Server Response
Write-Info "Testing Backend Server..."
$backend = Invoke-WebRequest -Uri "http://localhost:5000/" -UseBasicParsing
if ($backend.StatusCode -eq 200) { Write-Pass "Backend server responding" } else { Write-Fail "Backend not responding" }

# Test 2: Register
Write-Info "Testing User Registration..."
$email = "debug$(Get-Random)@test.com"
$regBody = @{name="Debug User";email=$email;password="debug123"} | ConvertTo-Json
$reg = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/register" -Method POST -ContentType "application/json" -Body $regBody -UseBasicParsing
if ($reg.StatusCode -eq 201) { Write-Pass "User registration working" } else { Write-Fail "Registration failed: $($reg.StatusCode)" }

# Test 3: Login
Write-Info "Testing User Login..."
$loginBody = @{email=$email;password="debug123"} | ConvertTo-Json
$login = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
if ($login.StatusCode -eq 200) { 
    Write-Pass "User login working"
    $loginJson = $login.Content | ConvertFrom-Json
    $token = $loginJson.token
} else { 
    Write-Fail "Login failed: $($login.StatusCode)"
    $token = $null
}

# Test 4: Products
Write-Info "Testing Products API..."
$products = Invoke-WebRequest -Uri "http://localhost:5000/api/products" -UseBasicParsing
if ($products.StatusCode -eq 200) {
    $prod = $products.Content | ConvertFrom-Json
    Write-Pass "Products API working - Found $($prod.Count) products"
} else { 
    Write-Fail "Products API failed: $($products.StatusCode)" 
}

# Test 5: Addresses
if ($token) {
    Write-Info "Testing Address Management..."
    $addrBody = @{fullName="Test User";addressLine1="123 Test St";city="Delhi";zip="110001"} | ConvertTo-Json
    $headers = @{"Authorization"="Bearer $token"}
    
    $addAddr = Invoke-WebRequest -Uri "http://localhost:5000/api/addresses" -Method POST -ContentType "application/json" -Body $addrBody -Headers $headers -UseBasicParsing
    if ($addAddr.StatusCode -eq 201) { Write-Pass "Address creation working" } else { Write-Fail "Address creation failed" }
    
    $getAddr = Invoke-WebRequest -Uri "http://localhost:5000/api/addresses" -Headers $headers -UseBasicParsing
    if ($getAddr.StatusCode -eq 200) { Write-Pass "Address retrieval working" } else { Write-Fail "Address retrieval failed" }
}

# Test 6: Orders
if ($token) {
    Write-Info "Testing Orders API..."
    $orderBody = @{items=@(@{id=1;name="Ring";price=1299.99;quantity=1});total=1299.99;address=@{fullName="Test";addressLine1="123";city="Delhi";zip="110001"}} | ConvertTo-Json
    
    $createOrder = Invoke-WebRequest -Uri "http://localhost:5000/api/orders" -Method POST -ContentType "application/json" -Body $orderBody -Headers $headers -UseBasicParsing
    if ($createOrder.StatusCode -eq 201) { Write-Pass "Order creation working" } else { Write-Fail "Order creation failed" }
    
    $getOrders = Invoke-WebRequest -Uri "http://localhost:5000/api/orders" -Headers $headers -UseBasicParsing
    if ($getOrders.StatusCode -eq 200) { Write-Pass "Order retrieval working" } else { Write-Fail "Order retrieval failed" }
}

# Test Database
Write-Section "DATABASE TESTS"
Write-Info "Checking SQLite database..."
if (Test-Path "d:\jewellery-cart\backend\database.db") {
    Write-Pass "SQLite database file exists"
    $dbSize = (Get-Item "d:\jewellery-cart\backend\database.db").Length / 1KB
    Write-Info "Database size: $([Math]::Round($dbSize, 2)) KB"
} else {
    Write-Fail "SQLite database file not found"
}

# Test Frontend
Write-Section "FRONTEND TESTS"
Write-Info "Testing Frontend Server..."
$frontend = Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing
if ($frontend.StatusCode -eq 200) { Write-Pass "Frontend server responding" } else { Write-Fail "Frontend not responding" }

# Check frontend files
Write-Info "Checking Frontend Files..."
$frontendFiles = @(
    "src/App.jsx",
    "src/index.css",
    "src/main.jsx",
    "src/context/AuthContext.jsx",
    "src/context/ProductContext.jsx",
    "src/context/CartContext.jsx",
    "vite.config.js",
    "package.json"
)

foreach ($file in $frontendFiles) {
    if (Test-Path "d:\jewellery-cart\frontend\$file") {
        Write-Pass "$file exists"
    } else {
        Write-Fail "$file missing"
    }
}

# Test Backend Files
Write-Section "BACKEND FILES"
$backendFiles = @(
    "server.js",
    "db.js",
    "package.json",
    "routes/auth.js",
    "routes/products.js",
    "routes/addresses.js",
    "routes/orders.js"
)

foreach ($file in $backendFiles) {
    if (Test-Path "d:\jewellery-cart\backend\$file") {
        Write-Pass "$file exists"
    } else {
        Write-Fail "$file missing"
    }
}

# Summary
Write-Section "SUMMARY"
Write-Pass "Full-Stack Debugging Complete!"
Write-Info "Backend: http://localhost:5000"
Write-Info "Frontend: http://localhost:5173"
Write-Info "Database: SQLite (d:\jewellery-cart\backend\database.db)"
Write-Info "API Proxy: /api -> http://localhost:5000/api"

Write-Host "`nAll tests completed. Check above for any failures.`n" -ForegroundColor Cyan
