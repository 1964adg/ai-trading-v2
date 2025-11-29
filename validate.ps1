# validate. ps1 - Verifica encoding e sintassi pre-commit
# Uso: .\validate.ps1

Write-Host "
========================================" -ForegroundColor Cyan
Write-Host "VALIDAZIONE PRE-COMMIT" -ForegroundColor Cyan
Write-Host "========================================
" -ForegroundColor Cyan

$errors = 0

# ============================================================
# 1. Verifica encoding UTF-8 frontend
# ============================================================
Write-Host "1.  Verifica encoding frontend..." -ForegroundColor Yellow

$frontendFiles = @(
    "frontend\components\PriceHeader.tsx",
    "frontend\components\TradingChart.tsx",
    "frontend\lib\formatters.ts",
    "frontend\lib\types. ts",
    "frontend\lib\api. ts"
)

foreach ($f in $frontendFiles) {
    if (Test-Path $f) {
        $content = Get-Content $f -Raw -Encoding UTF8
        if ($content -match '[â€œÃ¢Ã€™]') {
            Write-Host "   ❌ ENCODING CORROTTO: $f" -ForegroundColor Red
            $errors++
        } else {
            Write-Host "   ✓ OK: $f" -ForegroundColor Green
        }
    } else {
        Write-Host "   ⚠ NON TROVATO: $f" -ForegroundColor Yellow
    }
}

# ============================================================
# 2. Verifica spazi doppi/tripli in Python
# ============================================================
Write-Host "
2. Verifica spazi multipli Python..." -ForegroundColor Yellow

$pythonFiles = Get-ChildItem backend -Recurse -Filter *.py -Exclude __pycache__
$spaceIssues = 0

foreach ($f in $pythonFiles) {
    $content = Get-Content $f.FullName -Raw
    
    # Cerca pattern: "word.   word" o "word  ." (doppio spazio attorno al punto)
    if ($content -match '\w\.   +\w|  +\. ') {
        Write-Host "   ❌ SPAZI DOPPI: $($f.FullName. Replace((Get-Location).Path + '\', ''))" -ForegroundColor Red
        $spaceIssues++
        $errors++
    }
}

if ($spaceIssues -eq 0) {
    Write-Host "   ✓ Nessun problema di spazi" -ForegroundColor Green
}

# ============================================================
# 3. Test import backend Python
# ============================================================
Write-Host "
3. Test import backend Python..." -ForegroundColor Yellow

Push-Location backend
$importTest = python -c "from api.market import router; from services.binance_service import binance_service; print('OK')" 2>&1
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Import backend OK" -ForegroundColor Green
} else {
    Write-Host "   ❌ Import backend FALLITO" -ForegroundColor Red
    Write-Host "   $importTest" -ForegroundColor Red
    $errors++
}

# ============================================================
# 4.  Verifica sintassi TypeScript
# ============================================================
Write-Host "
4. Verifica sintassi TypeScript..." -ForegroundColor Yellow

Push-Location frontend
if (Test-Path "node_modules") {
    $tsCheck = npx tsc --noEmit 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ TypeScript OK" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Errori TypeScript" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "   ⚠ node_modules mancante, skip check" -ForegroundColor Yellow
}
Pop-Location

# ============================================================
# RIEPILOGO
# ============================================================
Write-Host "
========================================" -ForegroundColor Cyan

if ($errors -eq 0) {
    Write-Host "✅ VALIDAZIONE OK - Puoi committare" -ForegroundColor Green
    Write-Host "========================================
" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "❌ VALIDAZIONE FALLITA - $errors errori trovati" -ForegroundColor Red
    Write-Host "========================================
" -ForegroundColor Cyan
    exit 1
}
