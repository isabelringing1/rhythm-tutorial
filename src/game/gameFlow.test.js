import { describe, expect, it } from 'vitest'
import {
  createGameFlowReducer,
  initialGameState,
} from './gameFlow.js'

const config = {
  steps: [
    { type: 'dialogue', lines: ['One', 'Two'] },
    { type: 'play', requiredSuccesses: 2 },
    { type: 'dialogue', lines: ['Done'] },
  ],
}

describe('game flow reducer', () => {
  it('moves through dialogue, play, countdown, and completion', () => {
    const reduce = createGameFlowReducer(config)
    let state = reduce(initialGameState, { type: 'START' })
    expect(state.mode).toBe('dialogue')

    state = reduce(state, { type: 'NEXT_DIALOGUE' })
    expect(state.dialogueLine).toBe(1)
    state = reduce(state, { type: 'NEXT_DIALOGUE' })
    expect(state.mode).toBe('loadingPlay')
    expect(state.remainingSuccesses).toBe(2)

    state = reduce(state, {
      type: 'PLAY_READY',
      performance: {},
    })
    state = reduce(state, {
      type: 'ATTEMPT_RESULT',
      isPerfect: true,
    })
    expect(state.remainingSuccesses).toBe(1)

    state = reduce(state, { type: 'RETRY' })
    state = reduce(state, {
      type: 'ATTEMPT_RESULT',
      isPerfect: true,
    })
    expect(state.remainingSuccesses).toBe(0)

    state = reduce(state, { type: 'PLAY_COMPLETE' })
    expect(state.mode).toBe('dialogue')
    state = reduce(state, { type: 'NEXT_DIALOGUE' })
    expect(state.mode).toBe('complete')
  })
})
