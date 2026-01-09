# Pattern Detection Architecture

## Overview Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Main Dashboard (page.tsx)                     │
│                                                                       │
│  ┌──────────────────────┐                                           │
│  │   ChartData (SWR)    │                                           │
│  │   + WebSocket        │                                           │
│  └──────────┬───────────┘                                           │
│             │ setCandles()                                          │
│             ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │              Centralized Pattern Store (Zustand)            │  │
│  │                                                              │  │
│  │  State:                          Actions:                   │  │
│  │  • candles                       • setCandles()             │  │
│  │  • detectedPatterns             • updateSettings()          │  │
│  │  • settings                      • runDetection()           │  │
│  │  • isDetecting                   • clearPatterns()          │  │
│  │  • lastRunAt                     • getPatternById()         │  │
│  │  • patternCounts (BUY/SELL/W)                              │  │
│  │                                                              │  │
│  │  Settings:                                                  │  │
│  │  • enabled: boolean                                         │  │
│  │  • minConfidence: 50-95                                     │  │
│  │  • scopeMode: ALL | LAST_N                                  │  │
│  │  • lookbackN: number                                        │  │
│  │  • realtimeMode: EACH_CANDLE | DEBOUNCED                   │  │
│  │  • debounceMs: number                                       │  │
│  │  • enabledPatterns: PatternType[]                           │  │
│  │                                                              │  │
│  │  Detection Logic:                                           │  │
│  │  • Reuses PatternDetector class                             │  │
│  │  • Filters by scope (ALL/LAST_N)                            │  │
│  │  • Triggers on candle updates (immediate or debounced)      │  │
│  │  • Filters by minConfidence                                 │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│             │                           │                            │
│             │ detectedPatterns          │ detectedPatterns           │
│             ▼                           ▼                            │
│  ┌──────────────────────┐   ┌─────────────────────────────┐        │
│  │   TradingChart       │   │   PatternAlertsPanel        │        │
│  │                      │   │                             │        │
│  │  • Displays chart    │   │  • Enable/disable toggle    │        │
│  │  • Shows pattern     │   │  • Min confidence slider    │        │
│  │    markers           │   │  • Scope mode selector      │        │
│  │    (BUY/SELL/W)      │   │  • Realtime mode selector   │        │
│  │                      │   │  • BUY/SELL/W counters      │        │
│  │                      │   │  • Recent patterns (5)      │        │
│  │                      │   │  • Click → navigate to      │        │
│  │                      │   │    /analysis?patternId=X    │        │
│  └──────────────────────┘   └─────────────────────────────┘        │
└───────────────────────────────────────────────────────────────────────┘

                            │ navigation with patternId
                            ▼

┌─────────────────────────────────────────────────────────────────────┐
│                      Analysis Page (analysis/page.tsx)                │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │         Query Param Handler (with Suspense)                │     │
│  │         • Reads patternId from URL                          │     │
│  │         • Sets selectedPatternId state                      │     │
│  └────────────────────────┬───────────────────────────────────┘     │
│                           │                                          │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │          Centralized Pattern Store (same instance)         │     │
│  │          • Reads detectedPatterns                           │     │
│  │          • Reads settings                                   │     │
│  │          • No independent detection                         │     │
│  └────────────────────────┬───────────────────────────────────┘     │
│                           │ detectedPatterns + selectedPatternId    │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │              PatternDetector Component                      │     │
│  │              • Shows all detected patterns                  │     │
│  │              • Highlights selected pattern (blue ring)      │     │
│  │              • Auto-scrolls to selected pattern             │     │
│  │              • Shows "Selected" badge                       │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │              PatternSelector Component                      │     │
│  │              • Updates centralized store settings           │     │
│  │              • Toggles enabledPatterns array                │     │
│  │              • Changes minConfidence                        │     │
│  └────────────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Pattern Detection Trigger
```
ChartData Update → setCandles() → Store
                                   ↓
                      Check if enabled && settings
                                   ↓
                    ┌──────────────┴──────────────┐
                    │                             │
         EACH_CANDLE mode           DEBOUNCED mode
                    │                             │
           Immediate detection         Wait debounceMs
                    │                             │
                    └──────────────┬──────────────┘
                                   ↓
                            runDetection()
                                   ↓
                    Filter by scopeMode (ALL/LAST_N)
                                   ↓
                    PatternDetector.detectPatterns()
                                   ↓
                    Filter by minConfidence
                                   ↓
                    Update detectedPatterns + counts
```

### 2. Pattern Display
```
Store.detectedPatterns
         │
         ├─────────────────────┬────────────────────┐
         │                     │                    │
         ▼                     ▼                    ▼
    TradingChart      PatternAlertsPanel    PatternDetector
    (markers)         (list + counters)    (full list + stats)
```

### 3. Deep-linking
```
User clicks pattern in PatternAlertsPanel
         │
         ▼
router.push('/analysis?patternId=X')
         │
         ▼
Analysis page loads with Suspense
         │
         ▼
useSearchParams() reads patternId
         │
         ▼
setSelectedPatternId(patternId)
         │
         ▼
PatternDetector highlights pattern
         │
         ├─ Visual: blue ring + badge
         └─ Scroll: smooth scroll to element
```

## Key Components

### Pattern Store (Zustand)
- **Location**: `frontend/stores/patternStore.ts`
- **Purpose**: Single source of truth for pattern detection
- **Shared by**: Main dashboard, Analysis page
- **Persistence**: In-memory (can be extended to localStorage)

### PatternAlertsPanel
- **Location**: `frontend/components/trading/PatternAlertsPanel.tsx`
- **Purpose**: Compact UI for pattern controls and quick view
- **Features**: Controls, counters, recent list, navigation

### PatternDetector
- **Location**: `frontend/components/PatternDetector.tsx`
- **Purpose**: Full pattern list display
- **Enhanced**: Highlighting and scroll-to for selected patterns

## Settings Impact

| Setting | Impact | Default |
|---------|--------|---------|
| enabled | Enable/disable detection | true |
| minConfidence | Filter patterns below threshold | 70% |
| scopeMode | ALL or LAST_N candles | ALL |
| lookbackN | Number of candles when LAST_N | 100 |
| realtimeMode | EACH_CANDLE or DEBOUNCED | DEBOUNCED |
| debounceMs | Delay for DEBOUNCED mode | 500ms |
| enabledPatterns | Which pattern types to detect | All 8 types |

## Pattern Types Supported

1. DOJI - Market indecision
2. HAMMER - Bullish reversal
3. SHOOTING_STAR - Bearish reversal
4. BULLISH_ENGULFING - Strong bullish signal
5. BEARISH_ENGULFING - Strong bearish signal
6. BULLISH_PIN_BAR - Price rejection downward
7. BEARISH_PIN_BAR - Price rejection upward
8. INSIDE_BAR - Consolidation
