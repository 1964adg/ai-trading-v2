import { renderHook, waitFor } from '@testing-library/react'
import { useBacktest } from '@/hooks/useBacktest'

// Mock fetch
global.fetch = jest.fn()

describe('useBacktest Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useBacktest())

    expect(result.current.isRunning).toBe(false)
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBe(null)
    expect(result.current.currentBacktest).toBe(null)
  })

  it('should handle successful backtest', async () => {
    const mockResponse = {
      total_trades: 10,
      total_pnl: 500,
      total_pnl_percent: 5,
      win_rate: 60,
      sharpe_ratio:  1.5,
      max_drawdown:  200,
      max_drawdown_percent: 2,
      trades: [],
      equity_curve: [],
      start_date: '2024-01-01',
      end_date: '2024-12-31'
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const { result } = renderHook(() => useBacktest())

    const config = {
      symbol: 'BTCUSDT',
      timeframes: ['1h'],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      initialCapital: 10000,
      positionSizing: { type: 'FIXED_PERCENT' as const, value: 2 },
      strategy: {
        id: 'ma_cross',
        name: 'MA Cross',
        description: 'Moving Average Crossover',
        parameters: []
      }
    }

    await waitFor(async () => {
      await result.current.runBacktest(config)
    })

    expect(result.current.error).toBe(null)
  })
})
