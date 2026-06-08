/**
 * Reproducer for the "1Y chart is missing today's bar" bug.
 *
 * Data flow: the UI sends only start_date for a range like 1Y; the yfinance
 * provider's transformQuery backfills end_date = today as a plain YYYY-MM-DD
 * string. getHistoricalData() then does `new Date("2026-06-08")`, which JS
 * parses as UTC midnight. yahoo-finance2 treats period2 as an EXCLUSIVE upper
 * bound, so today's bar (timestamped during today's session, after 00:00 UTC)
 * falls outside [period1, period2) and is dropped.
 *
 * The mock below replicates yahoo-finance2's exclusive-period2 filtering so the
 * test exercises the real boundary, not a stub that always returns everything.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { chartMock } = vi.hoisted(() => ({ chartMock: vi.fn() }))

vi.mock('yahoo-finance2', () => ({
  default: class {
    chart = chartMock
  },
}))

import { getHistoricalData } from '../helpers.js'

// Daily bars are timestamped during the trading session (here ~13:30 UTC,
// US RTH open), i.e. strictly after the day's 00:00 UTC midnight.
const BARS = [
  { date: new Date('2026-06-05T13:30:00Z'), open: 1, high: 2, low: 1, close: 2, volume: 100 },
  { date: new Date('2026-06-08T13:30:00Z'), open: 2, high: 3, low: 2, close: 3, volume: 200 }, // "today"
  { date: new Date('2026-06-09T13:30:00Z'), open: 3, high: 4, low: 3, close: 4, volume: 300 }, // "tomorrow"
]

beforeEach(() => {
  // Replicate yahoo-finance2: period2 is an exclusive upper bound.
  chartMock.mockReset()
  chartMock.mockImplementation((_sym: string, opts: { period1: Date; period2: Date }) => {
    const { period1, period2 } = opts
    const quotes = BARS.filter((b) => b.date >= period1 && b.date < period2)
    return Promise.resolve({ quotes })
  })
})

describe('getHistoricalData date-range boundary', () => {
  it("includes today's bar when end_date is today (1Y range)", async () => {
    const records = await getHistoricalData('AAPL', {
      startDate: '2025-06-08',
      endDate: '2026-06-08', // today, as transformQuery backfills it
      interval: '1d',
    })

    const dates = records.map((r) => r.date)
    expect(dates).toContain('2026-06-08') // <-- fails today: bar is dropped
  })

  it("does not pull in tomorrow's bar", async () => {
    const records = await getHistoricalData('AAPL', {
      startDate: '2025-06-08',
      endDate: '2026-06-08',
      interval: '1d',
    })

    const dates = records.map((r) => r.date)
    expect(dates).not.toContain('2026-06-09')
  })
})
