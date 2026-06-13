/**
 * statusForError maps provider exceptions to honest HTTP codes.
 *
 * Regression: a provider that doesn't implement a model (yfinance has no
 * FinancialRatios fetcher) threw `OpenBBError: Fetcher not found …`, which the
 * router blanket-wrapped as HTTP 500. A 500 reads as a server fault and logs a
 * red error in the browser; a capability gap should be 501 instead.
 */

import { describe, it, expect } from 'vitest'
import { statusForError } from '../router.js'
import {
  EmptyDataError,
  NetworkUnreachableError,
  OpenBBError,
} from '../../provider/utils/errors.js'

describe('statusForError', () => {
  it('maps a missing fetcher (model unsupported by provider) to 501', () => {
    const err = new OpenBBError("Fetcher not found for model 'FinancialRatios' in provider 'yfinance'.")
    expect(statusForError(err)).toBe(501)
  })

  it('maps a missing credential to 400', () => {
    expect(statusForError(new OpenBBError("Missing credential 'fmp_api_key'."))).toBe(400)
  })

  it('maps an unknown provider to 400', () => {
    expect(statusForError(new OpenBBError("Provider 'nope' not found in the registry. Available providers: yfinance"))).toBe(400)
  })

  it('maps empty data to 404', () => {
    expect(statusForError(new EmptyDataError('No historical data for 1101.TW'))).toBe(404)
  })

  it('maps a network-unreachable failure to 502', () => {
    expect(statusForError(new NetworkUnreachableError('fc.yahoo.com', 'ENOTFOUND'))).toBe(502)
  })

  it('leaves a genuinely unexpected error as 500', () => {
    expect(statusForError(new Error('boom'))).toBe(500)
    expect(statusForError(new OpenBBError('some other provider failure'))).toBe(500)
  })
})
