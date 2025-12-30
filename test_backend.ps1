# ============================================
#   AI TRADING V2 - COMPLETE BACKEND TEST
# ============================================

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  AI TRADING V2 - BACKEND TEST SUITE  ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Yellow

$baseUrl = "http://localhost:8000"

# ========== 1. TECHNICAL INDICATORS ==========
Write-Host "`n📊 TECHNICAL INDICATORS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n[1/6] RSI Indicator..." -ForegroundColor White
try {
    $rsi = Invoke-RestMethod -Uri "$baseUrl/api/indicators/rsi/BTCEUR/1h?period=14&limit=100"
    Write-Host "  ✅ RSI: $($rsi.current_rsi) | Signal: $($rsi.signal) | $($rsi.condition)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ RSI Failed: $_" -ForegroundColor Red
}

Write-Host "`n[2/6] MACD Indicator..." -ForegroundColor White
try {
    $macd = Invoke-RestMethod -Uri "$baseUrl/api/indicators/macd/BTCEUR/1h?fast=12&slow=26&signal=9&limit=100"
    Write-Host "  ✅ MACD: $($macd. macd) | Signal Line: $($macd.signal_line) | Histogram: $($macd.histogram)" -ForegroundColor Green
    Write-Host "     Signal: $($macd.signal) | $($macd.condition)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ MACD Failed:  $_" -ForegroundColor Red
}

Write-Host "`n[3/6] Bollinger Bands..." -ForegroundColor White
try {
    $bb = Invoke-RestMethod -Uri "$baseUrl/api/indicators/bollinger/BTCEUR/1h?period=20&std_dev=2.0&limit=100"
    Write-Host "  ✅ Upper: $($bb.upper) | Middle: $($bb.middle) | Lower: $($bb.lower)" -ForegroundColor Green
    Write-Host "     Signal:  $($bb.signal) | $($bb.condition)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Bollinger Failed: $_" -ForegroundColor Red
}

# ========== 2. RISK MANAGEMENT ==========
Write-Host "`n`n⚖️ RISK MANAGEMENT" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n[4/6] Position Size Calculator..." -ForegroundColor White
try {
    $psBody = @{
        account_balance = 10000
        risk_percentage = 2
        entry_price = 92000
        stop_loss_price = 90000
        leverage = 1
    } | ConvertTo-Json
    
    $ps = Invoke-RestMethod -Uri "$baseUrl/api/risk/position-size" -Method POST -Body $psBody -ContentType "application/json"
    Write-Host "  ✅ Position Size: $($ps. position_size)€ | Quantity: $($ps.quantity) BTC" -ForegroundColor Green
    Write-Host "     Risk: $($ps.risk_amount)€ ($($ps.position_pct)% of account) | Safe: $($ps.safe)" -ForegroundColor Green
    if ($ps.warnings.Count -gt 0) {
        Write-Host "     ⚠️ $($ps.warnings -join ', ')" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Position Size Failed: $_" -ForegroundColor Red
}

Write-Host "`n[5/6] Risk/Reward Calculator..." -ForegroundColor White
try {
    $rrBody = @{
        entry_price = 92000
        stop_loss_price = 90000
        take_profit_price = 98000
        position_size = 5000
    } | ConvertTo-Json
    
    $rr = Invoke-RestMethod -Uri "$baseUrl/api/risk/risk-reward" -Method POST -Body $rrBody -ContentType "application/json"
    Write-Host "  ✅ R:R Ratio: $($rr.rr_ratio):1 | Direction: $($rr.direction)" -ForegroundColor Green
    Write-Host "     Risk: $($rr. risk_pct)% ($($rr.potential_loss)€) | Reward: $($rr.reward_pct)% ($($rr.potential_profit)€)" -ForegroundColor Green
    Write-Host "     Acceptable:  $($rr.acceptable)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Risk/Reward Failed: $_" -ForegroundColor Red
}

# ========== 3. BACKTESTING ==========
Write-Host "`n`n📈 BACKTESTING ENGINE" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n[6/6] MA Cross Strategy Backtest (takes 2-3 seconds)..." -ForegroundColor White
try {
    $btBody = @{
        symbol = "BTCEUR"
        timeframe = "1h"
        strategy = "ma_cross"
        initial_capital = 10000
        position_size_pct = 10
        allow_shorts = $true
        fast_period = 9
        slow_period = 21
        stop_loss_pct = 2.0
        take_profit_pct = 4.0
    } | ConvertTo-Json
    
    $bt = Invoke-RestMethod -Uri "$baseUrl/api/backtest" -Method POST -Body $btBody -ContentType "application/json"
    Write-Host "  ✅ Backtest Complete!" -ForegroundColor Green
    Write-Host "     Total Trades: $($bt.total_trades) | Win Rate: $($bt.win_rate)%" -ForegroundColor Green
    Write-Host "     P/L: $($bt.total_pnl)€ ($($bt.total_pnl_percent)%) | Max DD: $($bt. max_drawdown_percent)%" -ForegroundColor Green
    Write-Host "     Initial: $($bt.initial_capital)€ → Final: $($bt.final_capital)€" -ForegroundColor Green
    Write-Host "     Profit Factor: $($bt.profit_factor) | Sharpe:  $($bt.sharpe_ratio)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Backtest Failed: $_" -ForegroundColor Red
}

# ========== SUMMARY ==========
Write-Host "`n`n╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        ✅ ALL TESTS COMPLETE!          ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Start Frontend:  cd frontend && npm run dev" -ForegroundColor White
Write-Host "  2. Open Browser: http://localhost:3000" -ForegroundColor White
Write-Host "  3. Test UI components and integration`n" -ForegroundColor White