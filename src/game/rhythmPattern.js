import {
  isValidFlagId,
  parseInlineFlagDirective,
} from './flags.js'

const REST_SYMBOL = '.'
const SYMBOLS_BY_INPUT_MODE = Object.freeze({
  keyPress: Object.freeze({ x: 'press' }),
  keyDownUp: Object.freeze({ d: 'down', u: 'up' }),
})

function assertPositiveInteger(value, field) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`)
  }
}

export function parseRhythmPattern(
  pattern,
  {
    bpm,
    beatsPerBar = 4,
    stepsPerBeat = 4,
    inputMode = 'keyPress',
  },
) {
  if (typeof pattern !== 'string' || pattern.trim() === '') {
    throw new Error('pattern must be a non-empty string')
  }
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new Error('bpm must be a positive number')
  }
  assertPositiveInteger(beatsPerBar, 'beatsPerBar')
  assertPositiveInteger(stepsPerBeat, 'stepsPerBeat')
  const eventTypeBySymbol = SYMBOLS_BY_INPUT_MODE[inputMode]
  if (!eventTypeBySymbol) {
    throw new Error(`unknown instrument input mode "${inputMode}"`)
  }

  const bars = pattern.split('|').map((bar) => bar.trim())
  if (bars.some((bar) => bar === '')) {
    throw new Error('pattern contains an empty bar')
  }

  const secondsPerBeat = 60 / bpm
  const secondsPerStep = secondsPerBeat / stepsPerBeat
  const notes = []

  bars.forEach((bar, barIndex) => {
    const beats = bar.split(/\s+/)
    if (beats.length !== beatsPerBar) {
      throw new Error(
        `bar ${barIndex + 1} must contain ${beatsPerBar} beats; found ${beats.length}`,
      )
    }

    beats.forEach((beat, beatIndex) => {
      if (beat.length !== stepsPerBeat) {
        throw new Error(
          `bar ${barIndex + 1}, beat ${beatIndex + 1} must contain ${stepsPerBeat} steps`,
        )
      }

      ;[...beat].forEach((symbol, stepIndex) => {
        if (symbol !== REST_SYMBOL && !eventTypeBySymbol[symbol]) {
          throw new Error(
            `invalid rhythm symbol "${symbol}" at bar ${barIndex + 1}, beat ${beatIndex + 1}`,
          )
        }
        if (symbol !== REST_SYMBOL) {
          const absoluteBeat = barIndex * beatsPerBar + beatIndex
          notes.push({
            bar: barIndex,
            beat: beatIndex,
            step: stepIndex,
            time: absoluteBeat * secondsPerBeat + stepIndex * secondsPerStep,
            eventType: eventTypeBySymbol[symbol],
          })
        }
      })
    })
  })

  if (notes.length === 0) {
    throw new Error('pattern must contain at least one hit')
  }

  return Object.freeze({
    bars: bars.map((bar) => bar.split(/\s+/)),
    notes: notes.map(Object.freeze),
    barCount: bars.length,
    beatsPerBar,
    stepsPerBeat,
    secondsPerBeat,
    secondsPerStep,
    duration: bars.length * beatsPerBar * secondsPerBeat,
  })
}

export function getNextMeasureStart(
  playbackTime,
  { beatOffset = 0, measureDuration, minimumLead = 0 },
) {
  if (!Number.isFinite(measureDuration) || measureDuration <= 0) {
    throw new Error('measureDuration must be a positive number')
  }

  const earliestStart = playbackTime + minimumLead
  const measuresSinceOffset = (earliestStart - beatOffset) / measureDuration
  return beatOffset + Math.max(0, Math.ceil(measuresSinceOffset)) * measureDuration
}

function validateDialogueStep(step, index) {
  if (!Array.isArray(step.lines) || step.lines.length === 0) {
    throw new Error(`step ${index + 1}: dialogue must contain at least one line`)
  }
  const lineFlags = {}
  let visibleLineCount = 0
  step.lines.forEach((line, lineIndex) => {
    if (typeof line !== 'string' || line.trim() === '') {
      throw new Error(
        `step ${index + 1}: dialogue line ${lineIndex + 1} must be text`,
      )
    }

    const flag = parseInlineFlagDirective(line)
    if (flag) {
      lineFlags[lineIndex] = flag
    } else if (line.startsWith('[{')) {
      throw new Error(
        `step ${index + 1}: dialogue line ${lineIndex + 1} contains an invalid flag directive`,
      )
    } else {
      visibleLineCount += 1
    }
  })
  if (visibleLineCount === 0) {
    throw new Error(
      `step ${index + 1}: dialogue must contain at least one visible line`,
    )
  }

  const lineToCharacterState = step.lineToCharacterState ?? {}
  if (
    typeof lineToCharacterState !== 'object' ||
    Array.isArray(lineToCharacterState)
  ) {
    throw new Error(
      `step ${index + 1}: lineToCharacterState must be an object`,
    )
  }

  const normalizedCharacterStates = {}
  Object.entries(lineToCharacterState).forEach(([lineKey, characterStates]) => {
    const lineIndex = Number(lineKey)
    if (
      !Number.isInteger(lineIndex) ||
      lineIndex < 0 ||
      lineIndex >= step.lines.length
    ) {
      throw new Error(
        `step ${index + 1}: dialogue character state line "${lineKey}" is invalid`,
      )
    }
    if (
      !Array.isArray(characterStates) ||
      characterStates.some(
        (characterState) =>
          !Array.isArray(characterState) ||
          characterState.length !== 3 ||
          !Number.isInteger(characterState[0]) ||
          characterState[0] < 0 ||
          typeof characterState[1] !== 'string' ||
          characterState[1] === '' ||
          typeof characterState[2] !== 'string' ||
          characterState[2] === '',
      )
    ) {
      throw new Error(
        `step ${index + 1}: dialogue character states for line ${lineIndex} must be an array of [characterIndex, stateId, state] entries`,
      )
    }

    normalizedCharacterStates[lineIndex] = Object.freeze(
      characterStates.map((characterState) =>
        Object.freeze([...characterState]),
      ),
    )
  })

  return {
    lineFlags: Object.freeze(lineFlags),
    lineToCharacterState: Object.freeze(normalizedCharacterStates),
  }
}

function validateFlagStep(step, index) {
  if (!isValidFlagId(step.id)) {
    throw new Error(`step ${index + 1}: flag id is invalid`)
  }
  if (typeof step.value !== 'boolean') {
    throw new Error(`step ${index + 1}: flag value must be true or false`)
  }

  return Object.freeze({
    type: 'flag',
    id: step.id,
    value: step.value,
  })
}

function resolveInstrument(step, index, instrumentsById) {
  if (!instrumentsById) {
    throw new Error(
      `step ${index + 1}: instrument config is required for "${step.type}" steps`,
    )
  }
  if (typeof step.instrumentId !== 'string' || step.instrumentId === '') {
    throw new Error(`step ${index + 1}: instrumentId is required`)
  }

  const instrument = instrumentsById.get(step.instrumentId)
  if (!instrument) {
    throw new Error(
      `step ${index + 1}: unknown instrument "${step.instrumentId}"`,
    )
  }
  return instrument
}

function validateTryStep(step, index, instrumentsById) {
  assertPositiveInteger(step.numNotes, `step ${index + 1} numNotes`)
  return Object.freeze({
    ...step,
    instrument: resolveInstrument(step, index, instrumentsById),
  })
}

function validatePlayStep(step, index, defaults, instrumentsById) {
  const timing = { ...defaults.timing, ...step.timing }
  const requiredSuccesses = step.requiredSuccesses ?? 3
  assertPositiveInteger(requiredSuccesses, `step ${index + 1} requiredSuccesses`)

  if (typeof step.backingTrack !== 'string' || step.backingTrack === '') {
    throw new Error(`step ${index + 1}: backingTrack is required`)
  }
  if (!Array.isArray(step.patterns) || step.patterns.length === 0) {
    throw new Error(`step ${index + 1}: patterns must be a non-empty array`)
  }
  if (step.instrumentId !== undefined || step.pattern !== undefined) {
    throw new Error(
      `step ${index + 1}: instrumentId and pattern must be defined inside patterns`,
    )
  }
  if (
    !Number.isFinite(timing.perfectWindow) ||
    !Number.isFinite(timing.goodWindow) ||
    timing.perfectWindow < 0 ||
    timing.goodWindow < timing.perfectWindow
  ) {
    throw new Error(`step ${index + 1}: timing windows are invalid`)
  }

  const instrumentIds = new Set()
  const keyBindings = new Set()
  const patterns = step.patterns.map((patternConfig) => {
    if (!patternConfig || typeof patternConfig !== 'object') {
      throw new Error(`step ${index + 1}: each pattern must be an object`)
    }
    const instrument = resolveInstrument(
      { type: 'play', instrumentId: patternConfig.instrumentId },
      index,
      instrumentsById,
    )
    if (instrumentIds.has(instrument.id)) {
      throw new Error(
        `step ${index + 1}: duplicate pattern for instrument "${instrument.id}"`,
      )
    }
    if (keyBindings.has(instrument.keyBinding)) {
      throw new Error(
        `step ${index + 1}: pattern instruments must use unique key bindings`,
      )
    }
    instrumentIds.add(instrument.id)
    keyBindings.add(instrument.keyBinding)

    const chart = parseRhythmPattern(patternConfig.pattern, {
      ...step,
      inputMode: instrument.inputMode,
    })
    if (chart.barCount !== 1) {
      throw new Error(
        `step ${index + 1}: play patterns must contain one measure`,
      )
    }
    return Object.freeze({
      ...patternConfig,
      instrument,
      chart,
    })
  })

  const notes = patterns
    .flatMap(({ chart, instrument }) =>
      chart.notes.map((note) =>
        Object.freeze({ ...note, instrumentId: instrument.id, instrument }),
      ),
    )
    .sort((first, second) => first.time - second.time)
  const chart = Object.freeze({
    duration: patterns[0].chart.duration,
    notes: Object.freeze(notes),
  })

  return Object.freeze({
    ...step,
    patterns: Object.freeze(patterns),
    requiredSuccesses,
    poseDuration: step.poseDuration ?? 0.12,
    timing: Object.freeze(timing),
    chart,
  })
}

export function compileGameConfig(config, instruments) {
  if (!config || !Array.isArray(config.steps) || config.steps.length === 0) {
    throw new Error('game config must contain at least one step')
  }

  const defaults = {
    timing: {
      calibrationOffset: 0,
      perfectWindow: 0.06,
      goodWindow: 0.14,
      ...config.defaults?.timing,
    },
  }
  const instrumentsById = instruments
    ? new Map(instruments.map((instrument) => [instrument.id, instrument]))
    : null

  const steps = config.steps.map((step, index) => {
    if (step.type === 'dialogue') {
      const { lineFlags, lineToCharacterState } = validateDialogueStep(
        step,
        index,
      )
      return Object.freeze({
        ...step,
        lines: Object.freeze([...step.lines]),
        lineFlags,
        lineToCharacterState,
      })
    }
    if (step.type === 'play') {
      return validatePlayStep(step, index, defaults, instrumentsById)
    }
    if (step.type === 'try') {
      return validateTryStep(step, index, instrumentsById)
    }
    if (step.type === 'flag') {
      return validateFlagStep(step, index)
    }
    throw new Error(`step ${index + 1}: unknown type "${step.type}"`)
  })

  return Object.freeze({ ...config, steps: Object.freeze(steps) })
}
