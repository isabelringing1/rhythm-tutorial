export const PRACTICE_TIMING = Object.freeze({
  bpm: 125,
  beatOffset: 0.37,
  calibrationOffset: 0,
  perfectWindow: 0.06,
  goodWindow: 0.14,
})

export function judgeBeat(
  playbackTime,
  {
    bpm,
    beatOffset = 0,
    perfectWindow = 0.06,
    goodWindow = 0.14,
  },
) {
  const beatDuration = 60 / bpm
  const relativeTime = playbackTime - beatOffset
  const nearestBeat = Math.max(0, Math.round(relativeTime / beatDuration))
  const beatTime = beatOffset + nearestBeat * beatDuration
  const timingOffset = playbackTime - beatTime
  const timingError = Math.abs(timingOffset)

  let rating = 'miss'
  if (timingError <= perfectWindow) {
    rating = 'perfect'
  } else if (timingError <= goodWindow) {
    rating = 'good'
  }

  return {
    rating,
    timingError,
    timingOffset,
    beatTime,
  }
}

export function calculateMedian(values) {
  if (values.length === 0) return 0

  const sortedValues = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sortedValues.length / 2)

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middle]
  }

  return (sortedValues[middle - 1] + sortedValues[middle]) / 2
}

export function isBeatActive(playbackTime, { bpm, beatOffset }, duration) {
  if (playbackTime === null) return false

  const relativeTime = playbackTime - beatOffset
  if (relativeTime < 0) return false

  const beatDuration = 60 / bpm
  return relativeTime % beatDuration < duration
}
