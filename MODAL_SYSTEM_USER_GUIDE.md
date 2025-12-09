# Modal System User Guide
**Version:** 1.0  
**Date:** 9 Dicembre 2025

## Quick Reference Card

### Keyboard Shortcuts for Modals

| Key | Action |
|-----|--------|
| **ESC** | Close any open modal |
| **Spacebar** | Close any open modal |
| **Enter** | Confirm action in confirmation dialogs |
| **F12** | Open/Close keyboard shortcuts help |

---

## New Features

### 1. Modifica Position (Edit Position)

**Access:** Click the **"Modifica"** button on any open position in the Positions Panel

**Features:**
- Edit Stop Loss price
- Edit Take Profit price
- View current position details (Entry, Mark Price, P&L)
- Real-time percentage calculation from entry price
- Input validation to prevent errors

**How to Use:**
1. Click **"Modifica"** on a position
2. Enter desired Stop Loss price (optional)
3. Enter desired Take Profit price (optional)
4. Click **"Salva Modifiche"** to apply
5. Or press **ESC/Spacebar** to cancel

**Tips:**
- Percentages are calculated automatically as you type
- For LONG positions: Stop Loss < Entry Price, Take Profit > Entry Price
- For SHORT positions: Stop Loss > Entry Price, Take Profit < Entry Price
- Leave fields empty to remove stop/take profit

---

### 2. Trailing Stop Configuration

**Access:** Click the **"Trailing"** button on any open position in the Positions Panel

**Features:**
- Enable/disable trailing stop with toggle switch
- Configure trail distance (0.1% - 10%)
- Real-time preview of calculated stop price
- Automatic stop price adjustment as market moves in your favor
- Educational info about how trailing stops work

**How to Use:**
1. Click **"Trailing"** on a position
2. Toggle the switch to **enable** trailing stop
3. Set your desired **trail distance** percentage
4. Preview the calculated stop price
5. Click **"Applica"** to activate
6. Or press **ESC/Spacebar** to cancel

**How Trailing Stops Work:**
- The stop price automatically follows the market price
- Maintains your configured distance (e.g., 2% below peak for LONG)
- When price moves in your favor, stop moves with it
- When price reverses, stop stays fixed and closes position
- Protects profits while letting winners run

**Example (LONG position):**
```
Entry: $50,000
Trail Distance: 2%

Price rises to $51,000 → Stop moves to $49,980 (2% below)
Price rises to $52,000 → Stop moves to $50,960 (2% below)
Price drops to $51,500 → Stop stays at $50,960
Price drops to $50,960 → Position closed with profit
```

---

### 3. Smooth Loading Experience

**What Changed:**
- Position panel no longer flashes "Loading positions..."
- Data updates happen seamlessly in the background
- Loading indicator only shows on initial load
- Real-time updates every 5 seconds without interruption

**What You'll Notice:**
- Stable display - no more flickering
- Positions update smoothly
- P&L changes reflect immediately
- Professional, polished interface

---

## Modal Interactions

### Closing Modals
All modals can be closed using:
- ✅ **ESC key** - Quick exit
- ✅ **Spacebar** - Alternative quick exit
- ✅ **X button** - Click to close
- ✅ **Annulla/Cancel button** - Explicit cancel

**Note:** Spacebar no longer scrolls the page when a modal is open!

### Confirmation Dialogs
Some actions require confirmation:
- **Enter** - Quickly confirm
- **ESC/Spacebar** - Quickly cancel
- Buttons work too

### Keyboard Hints
Look at the bottom of each modal for available shortcuts:
```
Press Esc / Space to close
Press Enter to confirm or Esc / Space to cancel
```

---

## Position Panel Features

### Position Information Display
Each position shows:
- **Symbol** (e.g., BTCUSDT)
- **Side** (LONG/SHORT with color coding)
- **Leverage** (e.g., 10x)
- **Quantity** - Amount in base currency
- **Entry Price** - Your entry price
- **Mark Price** - Current market price
- **Unrealized P&L** - Current profit/loss
- **P&L Percentage** - % gain/loss from entry
- **Visual P&L bar** - Green for profit, red for loss

### Action Buttons
Each position has three buttons:
1. **Modifica** (Edit) - Modify stop loss and take profit
2. **Chiudi** (Close) - Close the position immediately
3. **Trailing** - Configure trailing stop

### Bulk Actions
At the bottom of the panel (when positions are open):
- **Chiudi Tutto** - Close all positions
- **🚨 Stop Emergenza** - Emergency close all (with confirmation)

---

## Trading Modes

The system works across all trading modes:
- **Paper Trading** - Practice with virtual funds
- **Testnet** - Test with Binance testnet
- **Real Trading** - Live trading with real funds

All modal features work the same way in every mode.

---

## Tips & Best Practices

### Stop Loss & Take Profit
- ✅ Always set a stop loss to protect capital
- ✅ Use realistic take profit targets (2-3x risk)
- ✅ Adjust stops as trade moves in your favor
- ❌ Don't set stops too tight (account for volatility)

### Trailing Stops
- ✅ Best for trending markets
- ✅ Use 1-3% trail distance for crypto
- ✅ Wider trails for volatile assets
- ✅ Tighter trails for calm markets
- ❌ Avoid in choppy/sideways markets

### Position Management
- ✅ Review positions regularly
- ✅ Update stops as market conditions change
- ✅ Close losing positions quickly
- ✅ Let winners run with trailing stops
- ❌ Don't overtrade - wait for setups

### Keyboard Efficiency
- Use **F1/F2** for quick buy/sell
- Use **ESC** to quickly exit modals
- Use **Enter** to confirm without clicking
- Use **F12** to review all shortcuts

---

## Troubleshooting

### Modal Won't Close
- Try pressing **ESC**
- Try pressing **Spacebar**
- Click the **X** button
- Click **Annulla/Cancel** button
- Refresh page if stuck (last resort)

### Input Not Accepting Numbers
- Ensure you're typing valid numbers
- Use decimal point (.) not comma (,)
- Check for trailing spaces
- Must be positive number > 0

### Trailing Stop Not Working
- Ensure percentage is between 0.1 and 10
- Check toggle switch is ON (blue)
- Verify calculated price makes sense
- For LONG: stop should be below market
- For SHORT: stop should be above market

### Position Not Updating
- Check internet connection
- Verify trading mode is correct
- Look for error messages
- Try refreshing the page
- Check API credentials (real/testnet modes)

---

## FAQ

**Q: What's the difference between Stop Loss and Trailing Stop?**  
A: Stop Loss is fixed at a price you set. Trailing Stop moves with the market price, protecting profits as the trade moves in your favor.

**Q: Can I have both Stop Loss and Trailing Stop?**  
A: Currently, use one or the other. Trailing Stop is recommended for active trades.

**Q: Why can't I edit my position?**  
A: Ensure you're not in the middle of closing it. Only open positions can be edited.

**Q: What happens if I close the modal without saving?**  
A: No changes are applied. Your position remains unchanged.

**Q: Can I use keyboard shortcuts while trading?**  
A: Yes! Press **F12** to see all available keyboard shortcuts. All shortcuts work even when modals are open.

**Q: Is my trailing stop visible to others?**  
A: Trailing stops are client-side. The actual stop order is placed on the exchange when triggered.

**Q: What's the recommended trail distance?**  
A: 1-3% for crypto. Adjust based on volatility and your strategy.

---

## Support

For issues or questions:
1. Check this guide first
2. Review `MODAL_FIX_COMPLETE_SUMMARY.md` for technical details
3. Check GitHub issues
4. Create a new issue with details

---

## Version History

**v1.0 (9 Dec 2025)**
- Initial release
- Loading cycle fix
- ESC/Spacebar modal close
- Modifica position modal
- Trailing stop configuration modal
- Comprehensive input validation
