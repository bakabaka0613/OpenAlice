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
import { toUTCTimestamp, formatBarDate } from '../KlinePanel'

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
