const HIT_SYMBOL = 'x'
const REST_SYMBOL = '.'

function assertPositiveInteger(value, field) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`)
  }
}

export function parseRhythmPattern(
  pattern,
  { bpm, beatsPerBar = 4, stepsPerBeat = 4 },
) {
  if (typeof pattern !== 'string' || pattern.trim() === '') {
    throw new Error('pattern must be a non-empty string')
  }
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new Error('bpm must be a positive number')
  }
  assertPositiveInteger(beatsPerBar, 'beatsPerBar')
  assertPositiveInteger(stepsPerBeat, 'stepsPerBeat')

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
        if (symbol !== HIT_SYMBOL && symbol !== REST_SYMBOL) {
          throw new Error(
            `invalid rhythm symbol "${symbol}" at bar ${barIndex + 1}, beat ${beatIndex + 1}`,
          )
        }
        if (symbol === HIT_SYMBOL) {
          const absoluteBeat = barIndex * beatsPerBar + beatIndex
          notes.push({
            bar: barIndex,
            beat: beatIndex,
            step: stepIndex,
            time: absoluteBeat * secondsPerBeat + stepIndex * secondsPerStep,
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
  step.lines.forEach((line, lineIndex) => {
    if (typeof line !== 'string' || line.trim() === '') {
      throw new Error(
        `step ${index + 1}: dialogue line ${lineIndex + 1} must be text`,
      )
    }
  })
}

function validatePlayStep(step, index, defaults) {
  const timing = { ...defaults.timing, ...step.timing }
  const requiredSuccesses = step.requiredSuccesses ?? 3
  assertPositiveInteger(requiredSuccesses, `step ${index + 1} requiredSuccesses`)

  if (typeof step.backingTrack !== 'string' || step.backingTrack === '') {
    throw new Error(`step ${index + 1}: backingTrack is required`)
  }
  if (typeof step.hitSound !== 'string' || step.hitSound === '') {
    throw new Error(`step ${index + 1}: hitSound is required`)
  }
  if (
    !Number.isFinite(timing.perfectWindow) ||
    !Number.isFinite(timing.goodWindow) ||
    timing.perfectWindow < 0 ||
    timing.goodWindow < timing.perfectWindow
  ) {
    throw new Error(`step ${index + 1}: timing windows are invalid`)
  }

  const chart = parseRhythmPattern(step.pattern, step)
  if (chart.barCount !== 1) {
    throw new Error(`step ${index + 1}: play patterns must contain one measure`)
  }

  return Object.freeze({
    ...step,
    requiredSuccesses,
    poseDuration: step.poseDuration ?? 0.12,
    timing: Object.freeze(timing),
    chart,
  })
}

export function compileGameConfig(config) {
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

  const steps = config.steps.map((step, index) => {
    if (step.type === 'dialogue') {
      validateDialogueStep(step, index)
      return Object.freeze({ ...step, lines: Object.freeze([...step.lines]) })
    }
    if (step.type === 'play') {
      return validatePlayStep(step, index, defaults)
    }
    throw new Error(`step ${index + 1}: unknown type "${step.type}"`)
  })

  return Object.freeze({ ...config, steps: Object.freeze(steps) })
}
