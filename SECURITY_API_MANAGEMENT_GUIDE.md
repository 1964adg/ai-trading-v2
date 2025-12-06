# Security & API Management Guide

This guide explains how to securely manage your Binance API keys and use the workspace layouts in AI Trading v2.

## 🔐 API Key Manager

The API Key Manager provides secure, encrypted storage for your Binance API credentials with zero-knowledge architecture.

### Security Features

- **AES-256-GCM Encryption**: Military-grade encryption for all stored credentials
- **PBKDF2 Key Derivation**: 210,000 iterations (OWASP 2023 recommended standard)
- **Zero-Knowledge Design**: Your credentials never leave your device unencrypted
- **Auto-Lock**: Automatically locks after 15 minutes of inactivity
- **Biometric Support**: Optional fingerprint/face recognition for quick unlock
- **Master Password**: All keys protected by a single master password you choose

### First-Time Setup

1. Click the **API Key Manager** button (or press **Ctrl+A**)
2. Create a strong master password (minimum 8 characters)
3. Confirm your password
4. Click **Create Secure Storage**

Your encrypted storage is now ready to use!

### Adding API Keys

1. Open the API Key Manager (Ctrl+A)
2. Enter your master password to unlock
3. Click **+ Add API Key**
4. Fill in the details:
   - **Key Name**: A friendly name to identify this key (e.g., "My Trading Account")
   - **Environment**: Choose Testnet (for testing) or Mainnet (for real trading)
   - **API Key**: Your Binance API key
   - **API Secret**: Your Binance API secret
5. Click **Add Key**

### Testing Connections

After adding a key, click the **Test** button to verify:
- API key is valid
- Connection to Binance is working
- Permissions are correctly configured

A green "✓ Tested" badge indicates successful connection.

### Security Best Practices

1. **Use Strong Master Password**: Mix uppercase, lowercase, numbers, and symbols
2. **Test First on Testnet**: Always test your setup on Binance Testnet before using mainnet
3. **Limit API Permissions**: Only grant permissions your trading strategy needs
4. **Never Share Keys**: Your master password and API keys should never be shared
5. **Lock When Away**: Always lock the manager when stepping away from your computer

### What Happens to My Keys?

- Keys are encrypted using AES-256-GCM before storage
- Encryption key is derived from your master password using PBKDF2
- Keys are stored locally in IndexedDB (with localStorage fallback)
- **No keys are ever sent to any server**
- Your master password is never stored - only you know it

## ⚙️ Layout Manager

The Layout Manager helps you organize your trading workspace with predefined and custom layouts.

### Predefined Layouts

Three professional layouts are included:

#### 1. Scalping Layout (F1)
Optimized for fast scalping and quick order entry:
- Large chart for price action
- Medium orderbook for depth analysis
- Quick order entry panels
- Position monitoring

**Best for**: Day traders, scalpers, high-frequency trading

#### 2. Analysis Layout (F2)
Focus on technical analysis and indicators:
- Large chart with full indicator suite
- Technical analysis panels
- Pattern recognition tools
- Position tracker

**Best for**: Swing traders, technical analysts, pattern traders

#### 3. Risk Monitoring Layout (F3)
Monitor positions and manage risk:
- Balanced chart view
- Large position manager
- Risk controls and limits
- Order monitoring

**Best for**: Risk managers, portfolio monitoring, position sizing

### Keyboard Shortcuts

Quick layout switching:
- **F1**: Switch to Scalping layout
- **F2**: Switch to Analysis layout
- **F3**: Switch to Risk Monitoring layout
- **F4**: Switch to last custom layout (if any)

### Creating Custom Layouts

1. Open Layout Manager (click the **Layout Manager** button)
2. Click **+ Create Custom Layout**
3. Configure your layout:
   - Set a name and description
   - Toggle panels on/off
   - Adjust panel sizes (Small/Medium/Large)
4. Click **Save Layout**

Your custom layout is saved and can be selected anytime.

### Managing Custom Layouts

- **Edit**: Click the ✏️ icon to modify a custom layout
- **Delete**: Click the 🗑️ icon to remove a custom layout
- **Switch**: Click any layout card to activate it

## ⌨️ Global Keyboard Shortcuts

### Layout Navigation
- **F1**: Scalping layout
- **F2**: Analysis layout
- **F3**: Risk Monitoring layout
- **F4**: Custom layout

### System
- **Ctrl+A**: Open API Key Manager
- **Ctrl+K**: Open Symbol Selector
- **Esc**: Cancel all pending orders

### Trading
- **Space**: Quick buy (hold)
- **Shift+Space**: Quick sell (hold)
- **Alt+1/2/3/5**: Position size presets

### Chart Navigation
- **+** or **=**: Zoom in
- **-**: Zoom out
- **Arrow Left/Right**: Pan chart
- **Home**: Reset zoom

### Panels
- **Ctrl+O**: Open Orders panel
- **Ctrl+P**: Open Positions panel
- **Ctrl+R**: Risk Manager

All shortcuts can be customized in the future via Settings.

## 🔒 Security FAQ

### Q: Where are my API keys stored?
A: Keys are stored encrypted on your local device using IndexedDB. They never leave your computer.

### Q: Can someone recover my keys if they access my computer?
A: No. Keys are encrypted with AES-256-GCM using a key derived from your master password. Without your master password, the keys cannot be decrypted.

### Q: What if I forget my master password?
A: Unfortunately, there is no password recovery option due to the zero-knowledge design. You will need to create new secure storage and re-enter your API keys.

### Q: Is it safe to use on public WiFi?
A: Yes, because keys are stored and encrypted locally. However, always use HTTPS connections and be cautious of network security in general.

### Q: How secure is 210,000 PBKDF2 iterations?
A: This is the OWASP 2023 recommended standard for password-based key derivation. It provides strong protection against brute-force attacks.

### Q: Can I use the same master password on multiple devices?
A: Each device has its own encrypted storage. You'll need to set up the API Key Manager separately on each device.

## 🎯 Quick Start Checklist

- [ ] Open API Key Manager (Ctrl+A)
- [ ] Create master password
- [ ] Add Binance Testnet API key
- [ ] Test connection
- [ ] Verify green "✓ Tested" badge
- [ ] Try different layouts (F1/F2/F3)
- [ ] Create a custom layout if needed
- [ ] Practice keyboard shortcuts
- [ ] Lock manager when done (🔒 Lock button)

## 📞 Support

For security concerns or questions:
1. Check this documentation
2. Review the codebase (all security code is open source)
3. Open an issue on GitHub
4. Never share your master password or API keys with anyone

---

**Remember**: Your security is in your hands. Use strong passwords, test on testnet first, and never share your credentials.
