/**
 * The K-line time axis must show the viewer's local wall-clock time, not UTC.
 *
 * lightweight-charts always renders a UTCTimestamp as UTC, so to display local
 * time we bake the viewer's offset into the value (the library's FAQ-recommended
 * approach). Intraday bars (stored UTC) shift into local time; daily bars stay
 * at calendar-date midnight so the day label never drifts across timezones.
 *
 * TZ is pinned to Asia/Taipei (+8, no DST) before importing the module so the
 * assertions are deterministic regardless of the host machine's timezone.
 */
process.env.TZ = 'Asia/Taipei'

import { describe, it, expect } from 'vitest'
import { toUTCTimestamp, formatBarDate, barsToSeriesData, barsSourceRef } from '../KlinePanel'
import type { HistoricalBar } from '../../../api/market'

describe('toUTCTimestamp', () => {
  it('shifts an intraday bar into local wall-clock time (+8 in Taipei)', () => {
    // 01:30 UTC == 09:30 Taipei. The chart renders the value as UTC, so we want
    // it to equal the epoch seconds of 09:30 "UTC" — i.e. the local wall clock.
    const ts = toUTCTimestamp('2026-06-08 01:30:00')
    expect(ts).toBe(Date.UTC(2026, 5, 8, 9, 30, 0) / 1000)
  })

  it('keeps a daily bar at calendar-date midnight (no timezone shift)', () => {
    const ts = toUTCTimestamp('2026-06-08')
    expect(ts).toBe(Date.UTC(2026, 5, 8, 0, 0, 0) / 1000)
  })
})

describe('formatBarDate', () => {
  it('renders an intraday UTC bar in local wall-clock time (+8 in Taipei)', () => {
    expect(formatBarDate('2026-06-08 01:00:00')).toBe('2026-06-08 09:00:00')
  })

  it('shifts the calendar day when local time crosses midnight', () => {
    // 23:30 UTC == 07:30 next-day Taipei.
    expect(formatBarDate('2026-06-08 23:30:00')).toBe('2026-06-09 07:30:00')
  })

  it('leaves a daily bar (plain date) untouched', () => {
    expect(formatBarDate('2026-06-08')).toBe('2026-06-08')
  })
})

describe('barsSourceRef', () => {
  // Regression: opening a chart from the sidebar/search carries ?source=<barId>,
  // so a barId is sent. A vendor barId ("yfinance|1101.TW") needs an assetClass
  // to route to the right client — the backend rejects a bare barId with
  // "needs an assetClass to route". So assetClass must ride along even when a
  // barId is the source. (bug: chart showed the route error for 1101.TW.)
  const selection = { symbol: '1101.TW', assetClass: 'equity' as const }

  it('keeps assetClass when an explicit barId source is picked', () => {
    expect(barsSourceRef(selection, 'yfinance|1101.TW')).toEqual({
      barId: 'yfinance|1101.TW',
      assetClass: 'equity',
    })
  })

  it('falls back to symbol + assetClass when no source is picked', () => {
    expect(barsSourceRef(selection, null)).toEqual({
      symbol: '1101.TW',
      assetClass: 'equity',
    })
  })
})

describe('barsToSeriesData', () => {
  // Regression: lightweight-charts throws "close must be a number, got=object,
  // value=null" from setData on a null-OHLC bar; with no ErrorBoundary above
  // KlinePanel that blanked the whole app (1101.TW had a null-close bar).
  const bar = (over: Partial<HistoricalBar>): HistoricalBar =>
    ({ date: '2026-06-06', open: 10, high: 11, low: 9, close: 10.5, volume: 100, ...over })

  it('drops bars whose OHLC contains null so setData never asserts', () => {
    const bars = [
      bar({ date: '2026-06-05' }),
      bar({ date: '2026-06-06', close: null as unknown as number }), // in-progress / no-trade day
    ]
    const { candleData, volumeData } = barsToSeriesData(bars)
    expect(candleData).toHaveLength(1)
    expect(volumeData).toHaveLength(1)
    expect(candleData.every((c) => typeof c.close === 'number')).toBe(true)
  })

  it('keeps candle and volume arrays index-aligned after filtering', () => {
    const bars = [
      bar({ date: '2026-06-05' }),
      bar({ date: '2026-06-06', high: null as unknown as number }),
      bar({ date: '2026-06-07', volume: null }), // null volume is fine → defaults to 0
    ]
    const { candleData, volumeData } = barsToSeriesData(bars)
    expect(candleData).toHaveLength(2)
    expect(volumeData).toHaveLength(2)
    expect(candleData.map((c) => c.time)).toEqual(volumeData.map((v) => v.time))
    expect(volumeData.find((v) => v.time === toUTCTimestamp('2026-06-07'))?.value).toBe(0)
  })
})
