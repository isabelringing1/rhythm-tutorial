export function createAttempt(noteCount) {
  return {
    judgments: Array(noteCount).fill(null),
    extraHits: 0,
  }
}

export function judgeChartTap(
  tapTime,
  noteTimes,
  attempt,
  { perfectWindow, goodWindow },
) {
  let nearestIndex = -1
  let nearestError = Number.POSITIVE_INFINITY

  noteTimes.forEach((noteTime, index) => {
    if (attempt.judgments[index] !== null) return
    const error = Math.abs(tapTime - noteTime)
    if (error < nearestError) {
      nearestIndex = index
      nearestError = error
    }
  })

  if (nearestIndex === -1 || nearestError > goodWindow) {
    return {
      attempt: { ...attempt, extraHits: attempt.extraHits + 1 },
      judgment: {
        rating: 'miss',
        noteIndex: null,
        timingError: nearestError,
        timingOffset: null,
      },
    }
  }

  const timingOffset = tapTime - noteTimes[nearestIndex]
  const rating = nearestError <= perfectWindow ? 'perfect' : 'good'
  const judgments = [...attempt.judgments]
  judgments[nearestIndex] = rating

  return {
    attempt: { ...attempt, judgments },
    judgment: {
      rating,
      noteIndex: nearestIndex,
      timingError: nearestError,
      timingOffset,
    },
  }
}

export function expireMissedNotes(
  playbackTime,
  noteTimes,
  attempt,
  goodWindow,
) {
  const judgments = [...attempt.judgments]
  const missedNoteIndexes = []

  noteTimes.forEach((noteTime, index) => {
    if (
      judgments[index] === null &&
      playbackTime > noteTime + goodWindow
    ) {
      judgments[index] = 'miss'
      missedNoteIndexes.push(index)
    }
  })

  return {
    attempt:
      missedNoteIndexes.length > 0 ? { ...attempt, judgments } : attempt,
    missedNoteIndexes,
  }
}

export function finishAttempt(attempt) {
  const missedNotes = attempt.judgments.filter(
    (judgment) => judgment === null || judgment === 'miss',
  ).length
  const isPerfect =
    missedNotes === 0 &&
    attempt.extraHits === 0 &&
    attempt.judgments.every((judgment) => judgment === 'perfect')

  return {
    isPerfect,
    missedNotes,
    extraHits: attempt.extraHits,
    judgments: attempt.judgments.map((judgment) => judgment ?? 'miss'),
  }
}
