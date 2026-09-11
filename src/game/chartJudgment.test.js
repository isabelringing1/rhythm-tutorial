import { describe, expect, it } from 'vitest'
import { createAttempt, judgeChartTap } from './chartJudgment.js'

const timing = { perfectWindow: 0.05, goodWindow: 0.1 }
const note = {
  eventType: 'down',
  instrumentId: 'pen',
  time: 1,
}

describe('chart judgment failure reasons', () => {
  it('identifies input outside the timing window', () => {
    const { judgment } = judgeChartTap(
      1.2,
      [note],
      createAttempt(1),
      timing,
      'down',
      'pen',
    )

    expect(judgment.failureReason).toBe('outsideTimingWindow')
  })

  it('identifies the wrong input event type', () => {
    const { judgment } = judgeChartTap(
      1,
      [note],
      createAttempt(1),
      timing,
      'up',
      'pen',
    )

    expect(judgment).toMatchObject({
      expectedEventType: 'down',
      failureReason: 'wrongEventType',
    })
  })

  it('identifies input with no remaining matching note', () => {
    const { judgment } = judgeChartTap(
      1,
      [note],
      createAttempt(1),
      timing,
      'press',
      'bell',
    )

    expect(judgment.failureReason).toBe('noMatchingNote')
  })
})
