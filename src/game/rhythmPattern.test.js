import { describe, expect, it } from 'vitest'
import {
  compileGameConfig,
  getNextMeasureStart,
  parseRhythmPattern,
} from './rhythmPattern.js'

describe('parseRhythmPattern', () => {
  it('converts subdivisions into stable note times', () => {
    const chart = parseRhythmPattern('x... .x.. .... ...x', {
      bpm: 120,
      beatsPerBar: 4,
      stepsPerBeat: 4,
    })

    expect(chart.notes.map((note) => note.time)).toEqual([0, 0.625, 1.875])
    expect(chart.duration).toBe(2)
  })

  it('supports multiple bars', () => {
    const chart = parseRhythmPattern('x. .. | .. .x', {
      bpm: 60,
      beatsPerBar: 2,
      stepsPerBeat: 2,
    })

    expect(chart.notes.map((note) => note.time)).toEqual([0, 3.5])
    expect(chart.barCount).toBe(2)
  })

  it('reports malformed bars and symbols', () => {
    expect(() =>
      parseRhythmPattern('x... ....', {
        bpm: 120,
        beatsPerBar: 4,
        stepsPerBeat: 4,
      }),
    ).toThrow('must contain 4 beats')

    expect(() =>
      parseRhythmPattern('x... ?... .... ....', {
        bpm: 120,
        beatsPerBar: 4,
        stepsPerBeat: 4,
      }),
    ).toThrow('invalid rhythm symbol')
  })
})

describe('getNextMeasureStart', () => {
  it('locks a turn to the next measure after the track offset', () => {
    expect(
      getNextMeasureStart(0.1, {
        beatOffset: 0.2,
        measureDuration: 2,
        minimumLead: 0.35,
      }),
    ).toBe(2.2)

    expect(
      getNextMeasureStart(2.3, {
        beatOffset: 0.2,
        measureDuration: 2,
        minimumLead: 0.35,
      }),
    ).toBe(4.2)
  })
})

describe('compileGameConfig', () => {
  it('applies the default success count and timing', () => {
    const config = compileGameConfig({
      steps: [
        {
          type: 'play',
          bpm: 120,
          beatsPerBar: 1,
          stepsPerBeat: 1,
          pattern: 'x',
          backingTrack: '/track.mp3',
          hitSound: '/hit.wav',
        },
      ],
    })

    expect(config.steps[0].requiredSuccesses).toBe(3)
    expect(config.steps[0].timing.perfectWindow).toBe(0.06)
    expect(config.steps[0].chart.notes).toHaveLength(1)
  })

  it('rejects play patterns longer than one measure', () => {
    expect(() =>
      compileGameConfig({
        steps: [
          {
            type: 'play',
            bpm: 120,
            beatsPerBar: 1,
            stepsPerBeat: 1,
            pattern: 'x | x',
            backingTrack: '/track.mp3',
            hitSound: '/hit.wav',
          },
        ],
      }),
    ).toThrow('must contain one measure')
  })
})
