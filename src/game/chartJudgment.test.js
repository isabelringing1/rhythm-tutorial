import { describe, expect, it } from 'vitest'
import {
  createAttempt,
  expireMissedNotes,
  finishAttempt,
  judgeChartTap,
} from './chartJudgment.js'

const timing = { perfectWindow: 0.06, goodWindow: 0.14 }

describe('chart judgment', () => {
  it('matches each tap to the nearest unmatched note', () => {
    let attempt = createAttempt(2)
    let result = judgeChartTap(0.04, [0, 0.5], attempt, timing)
    attempt = result.attempt
    expect(result.judgment.rating).toBe('perfect')

    result = judgeChartTap(0.61, [0, 0.5], attempt, timing)
    expect(result.judgment.rating).toBe('good')
    expect(result.attempt.judgments).toEqual(['perfect', 'good'])
  })

  it('only succeeds when every note is perfect with no extras', () => {
    let attempt = createAttempt(2)
    attempt = judgeChartTap(0, [0, 0.5], attempt, timing).attempt
    attempt = judgeChartTap(0.5, [0, 0.5], attempt, timing).attempt
    expect(finishAttempt(attempt).isPerfect).toBe(true)

    const withExtra = judgeChartTap(0.25, [0, 0.5], attempt, timing).attempt
    expect(finishAttempt(withExtra).isPerfect).toBe(false)
    expect(finishAttempt(withExtra).extraHits).toBe(1)
  })

  it('marks unplayed notes as misses', () => {
    const result = finishAttempt(createAttempt(2))
    expect(result.isPerfect).toBe(false)
    expect(result.missedNotes).toBe(2)
    expect(result.judgments).toEqual(['miss', 'miss'])
  })

  it('expires an unplayed note as soon as its hit window passes', () => {
    const expiration = expireMissedNotes(
      0.65,
      [0, 0.5, 1],
      createAttempt(3),
      0.14,
    )

    expect(expiration.missedNoteIndexes).toEqual([0, 1])
    expect(expiration.attempt.judgments).toEqual(['miss', 'miss', null])
  })
})
