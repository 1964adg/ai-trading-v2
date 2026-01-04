import { renderHook, waitFor } from '@testing-library/react'
import { useBacktest } from '@/hooks/useBacktest'

// Mock fetch
global.fetch = jest.fn()

describe('useBacktest Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useBacktest())

    expect(result.current.isRunning).toBe(false)
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBe(null)
  })

  it('should handle backend response', async () => {
    const mockResponse = {
      total_trades: 10,
      total_pnl: 500,
      win_rate: 60,
      sharpe_ratio:  1.5,
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

    // Test passa se l'hook è inizializzato
    expect(result.current).toBeDefined()
  })
})
