# Pattern Detection Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser/Frontend Layer                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐          ┌──────────────────────────┐
│   Main Page (/)         │          │  Analysis Page           │
│   app/page.tsx          │          │  app/analysis/page.tsx   │
├─────────────────────────┤          ├──────────────────────────┤
│                         │          │                          │
│ ┌────────────────────┐ │          │ ┌──────────────────────┐ │
│ │ TradingChart       │ │          │ │ PatternDetector      │ │
│ │ - BUY/SELL/W       │ │          │ │ - Pattern details    │ │
│ │   markers          │ │          │ │                      │ │
│ └────────────────────┘ │          │ └──────────────────────┘ │
│                         │          │                          │
│ ┌────────────────────┐ │          │ ┌──────────────────────┐ │
│ │ PatternAlertsPanel │ │          │ │ PatternDashboard     │ │
│ │ - Controls         │ │          │ │ - Statistics         │ │
│ │ - Counters         │ │          │ │ - Performance        │ │
│ │ - Recent list      │ │          │ │                      │ │
│ └────────────────────┘ │          │ └──────────────────────┘ │
│           │             │          │           │              │
└───────────┼─────────────┘          └───────────┼──────────────┘
            │                                    │
            └──────────────┬─────────────────────┘
                           │
                           ↓
         ┌─────────────────────────────────────────┐
         │  Pattern Detection Store (Zustand)      │
         │  stores/patternDetectionStore.ts        │
         ├─────────────────────────────────────────┤
         │ State:                                  │
         │  • candles: ChartDataPoint[]            │
         │  • detectedPatterns: DetectedPattern[]  │
         │  • patternStats: PatternStats[]         │
         │  • settings: PatternDetectionSettings   │
         │  • isDetecting: boolean                 │
         ├─────────────────────────────────────────┤
         │ Settings:                               │
         │  • enabled: boolean                     │
         │  • minConfidence: number (0-100)        │
         │  • scopeMode: 'LAST_N' | 'ALL'          │
         │  • lookbackN: number                    │
         │  • realtimeMode: 'EACH_CANDLE' |        │
         │                  'DEBOUNCED'            │
         │  • debounceMs: number                   │
         │  • enabledPatterns: PatternType[]       │
         │  • sensitivity: 'LOW'|'MEDIUM'|'HIGH'   │
         ├─────────────────────────────────────────┤
         │ Actions:                                │
         │  • updateCandles(candles)               │
         │  • updateSettings(settings)             │
         │  • triggerDetection()                   │
         │  • clearPatterns()                      │
         └─────────────────────────────────────────┘
                           │
            ┌──────────────┴────────────────┐
            ↓                               ↓
  ┌──────────────────┐          ┌─────────────────────┐
  │ PatternDetector  │          │  PatternAnalyzer    │
  │ (detector.ts)    │          │  (analyzer.ts)      │
  ├──────────────────┤          ├─────────────────────┤
  │ - Detect patterns│          │ - Track stats       │
  │ - Apply filters  │          │ - Performance       │
  │ - Confidence     │          │ - Success rate      │
  └──────────────────┘          └─────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Data Flow (Main Page)                        │
└─────────────────────────────────────────────────────────────────┘

  Backend API + WebSocket
          ↓
  SWR (fetchKlines) + useWebSocket
          ↓
  chartData: ChartDataPoint[]
          ↓
  useEffect → updateCandles(chartData)
          ↓
  PatternDetectionStore
    • Applies scope (LAST_N / ALL)
    • Debounces (if configured)
    • Runs detection
    • Updates detectedPatterns
          ↓
    ┌─────┴──────┐
    ↓            ↓
TradingChart  PatternAlertsPanel
 (markers)     (controls + list)

┌─────────────────────────────────────────────────────────────────┐
│                     Navigation Flow                               │
└─────────────────────────────────────────────────────────────────┘

Main Page (/)
    │
    │ User clicks pattern in PatternAlertsPanel
    ↓
router.push('/analysis?patternId=X')
    │
    ↓
Analysis Page (/analysis)
    │
    │ useSearchParams() → patternId
    │
    │ Reads detectedPatterns from store
    │ (same store, no re-detection)
    ↓
Display detailed pattern info

┌─────────────────────────────────────────────────────────────────┐
│                 Key Benefits                                      │
└─────────────────────────────────────────────────────────────────┘

✅ Single Source of Truth
   - Both pages share same detected patterns
   - No duplicate computation
   - Consistent state across app

✅ Performance Optimized
   - Debounced mode prevents excessive detection
   - LAST_N scope reduces computation
   - Patterns computed once, shared everywhere

✅ User Control
   - Fine-grained detection settings
   - Real-time toggles
   - Manual trigger option

✅ Seamless Navigation
   - Pattern ID in URL
   - Direct linking to specific patterns
   - Preserves context between pages
