import { describe, expect, it } from 'vitest'
import { createCharacterStateMachine } from './characterStateMachine.js'

const config = {
  layers: [
    { id: 'body', type: 'fixed', src: '/body.png' },
    {
      id: 'arm',
      type: 'stateful',
      defaultState: 'down',
      states: { down: '/arm-down.png', up: '/arm-up.png' },
    },
    {
      id: 'face',
      type: 'stateful',
      defaultState: 'neutral',
      states: {
        neutral: '/neutral.png',
        happy: '/happy.png',
        mad: '/mad.png',
      },
    },
  ],
}

describe('character state machine', () => {
  it('runs category timers independently and returns each to its default', () => {
    const character = createCharacterStateMachine(config)

    character.playState('face', 'happy', 0.2)
    character.playState('arm', 'up', 0.1)
    expect(character.getState('face')).toBe('happy')
    expect(character.getState('arm')).toBe('up')

    character.update(0.1)
    expect(character.getState('face')).toBe('happy')
    expect(character.getState('arm')).toBe('down')

    character.update(0.1)
    expect(character.getState('face')).toBe('neutral')
  })

  it('lets the newest state and timer replace an active state', () => {
    const character = createCharacterStateMachine(config)

    character.playState('face', 'happy', 1)
    character.update(0.5)
    character.playState('face', 'mad', 0.2)
    character.update(0.2)

    expect(character.getState('face')).toBe('neutral')
  })

  it('rejects unknown categories, states, and invalid durations', () => {
    const character = createCharacterStateMachine(config)

    expect(() => character.playState('leg', 'up', 1)).toThrow(
      'unknown character state category',
    )
    expect(() => character.playState('face', 'sleepy', 1)).toThrow(
      'unknown state',
    )
    expect(() => character.playState('face', 'happy', 0)).toThrow(
      'positive number',
    )
  })

  it('validates layer configuration', () => {
    expect(() =>
      createCharacterStateMachine({
        layers: [
          {
            id: 'face',
            type: 'stateful',
            defaultState: 'missing',
            states: { neutral: '/neutral.png' },
          },
        ],
      }),
    ).toThrow('valid defaultState')
  })
})
