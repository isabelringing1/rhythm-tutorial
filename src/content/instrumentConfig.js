const INPUT_MODES = new Set(['keyPress', 'keyDownUp'])
const ACTION_DURATION_MODES = new Set(['untilKeyUp', 'untilTurnEnd'])

function requireSoundPath(instrument, field) {
  if (typeof instrument[field] !== 'string' || instrument[field] === '') {
    throw new Error(`instrument "${instrument.id}" requires ${field}`)
  }
}

function compileTiming(instrument) {
  const timing = instrument.timing
  if (
    !timing ||
    !Number.isFinite(timing.perfectWindow) ||
    !Number.isFinite(timing.goodWindow) ||
    timing.perfectWindow < 0 ||
    timing.goodWindow < timing.perfectWindow
  ) {
    throw new Error(`instrument "${instrument.id}" has invalid timing windows`)
  }

  return Object.freeze({ ...timing })
}

function compileCharacterActions(instrument) {
  const requiredEvents =
    instrument.inputMode === 'keyPress' ? ['press'] : ['down', 'up']
  const actions = instrument.characterActions
  if (!actions || typeof actions !== 'object' || Array.isArray(actions)) {
    throw new Error(`instrument "${instrument.id}" requires characterActions`)
  }

  const compiled = {}
  requiredEvents.forEach((eventType) => {
    const action = actions[eventType]
    if (
      !action ||
      typeof action.category !== 'string' ||
      action.category === '' ||
      typeof action.state !== 'string' ||
      action.state === '' ||
      (!ACTION_DURATION_MODES.has(action.duration) &&
        (!Number.isFinite(action.duration) || action.duration <= 0))
    ) {
      throw new Error(
        `instrument "${instrument.id}" has an invalid ${eventType} character action`,
      )
    }
    compiled[eventType] = Object.freeze({ ...action })
  })

  return Object.freeze(compiled)
}

export function compileInstrumentConfig(instruments) {
  if (!Array.isArray(instruments) || instruments.length === 0) {
    throw new Error('instrument config must contain at least one instrument')
  }

  const ids = new Set()
  const compiled = instruments.map((instrument) => {
    if (!instrument || typeof instrument.id !== 'string' || instrument.id === '') {
      throw new Error('instrument id is required')
    }
    if (ids.has(instrument.id)) {
      throw new Error(`duplicate instrument id "${instrument.id}"`)
    }
    ids.add(instrument.id)

    if (
      typeof instrument.keyBinding !== 'string' ||
      instrument.keyBinding === ''
    ) {
      throw new Error(`instrument "${instrument.id}" requires keyBinding`)
    }
    if (!INPUT_MODES.has(instrument.inputMode)) {
      throw new Error(`instrument "${instrument.id}" has an invalid inputMode`)
    }

    if (instrument.inputMode === 'keyPress') {
      requireSoundPath(instrument, 'keyPressSound')
      if (instrument.keyDownSound || instrument.keyUpSound) {
        throw new Error(
          `keyPress instrument "${instrument.id}" cannot define down/up sounds`,
        )
      }
    } else {
      requireSoundPath(instrument, 'keyDownSound')
      requireSoundPath(instrument, 'keyUpSound')
      if (instrument.keyPressSound) {
        throw new Error(
          `keyDownUp instrument "${instrument.id}" cannot define keyPressSound`,
        )
      }
    }

    return Object.freeze({
      ...instrument,
      timing: compileTiming(instrument),
      characterActions: compileCharacterActions(instrument),
    })
  })

  return Object.freeze(compiled)
}

export const INSTRUMENTS = compileInstrumentConfig([
  {
    id: 'bell',
    keyBinding: 'KeyJ',
    inputMode: 'keyPress',
    keyPressSound: '/audio/bell.wav',
    timing: {
      perfectWindow: 0.06,
      goodWindow: 0.14,
    },
    characterActions: {
      press: {
        category: 'leftArm',
        state: 'up',
        duration: 0.12,
      },
    },
  },
  {
    id: 'pen',
    keyBinding: 'KeyK',
    inputMode: 'keyDownUp',
    keyDownSound: '/audio/pen_down1.mp3',
    keyUpSound: '/audio/pen_up.wav',
    timing: {
      perfectWindow: 0.1,
      goodWindow: 0.14,
    },
    characterActions: {
      down: {
        category: 'rightArm',
        state: 'upPressed',
        duration: 'untilKeyUp',
      },
      up: {
        category: 'rightArm',
        state: 'upReleased',
        duration: 'untilTurnEnd',
      },
    },
  },
])
