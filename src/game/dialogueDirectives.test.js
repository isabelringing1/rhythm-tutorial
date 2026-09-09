import { describe, expect, it } from 'vitest'
import { parseInlineActionDirective } from './flags.js'
import { compileGameConfig } from './rhythmPattern.js'

describe('dialogue action directives', () => {
  it('uses the token after action as the action name', () => {
    expect(parseInlineActionDirective('[{action}{request_mic}]')).toBe(
      'request_mic',
    )
  })

  it('stores actions separately from visible dialogue lines', () => {
    const config = compileGameConfig({
      steps: [
        {
          type: 'dialogue',
          lines: ['Please allow microphone access.', '[{action}{request_mic}]'],
        },
      ],
    })

    expect(config.steps[0].lineActions).toEqual({ 1: 'request_mic' })
  })
})
