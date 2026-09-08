export function createAttempt(noteCount) {
  return {
    judgments: Array(noteCount).fill(null),
    extraHits: 0,
  }
}

export function judgeChartTap(
  tapTime,
  notes,
  attempt,
  { perfectWindow, goodWindow },
  inputEventType = 'press',
  instrumentId,
) {
  let nearestIndex = -1
  let nearestError = Number.POSITIVE_INFINITY

  notes.forEach((note, index) => {
    if (attempt.judgments[index] !== null) return
    if (
      instrumentId !== undefined &&
      typeof note !== 'number' &&
      note.instrumentId !== instrumentId
    ) {
      return
    }
    const noteTime = typeof note === 'number' ? note : note.time
    const error = Math.abs(tapTime - noteTime)
    if (error < nearestError) {
      nearestIndex = index
      nearestError = error
    }
  })

  const nearestNote = notes[nearestIndex]
  const nearestNoteTime =
    typeof nearestNote === 'number' ? nearestNote : nearestNote?.time
  const nearestEventType =
    typeof nearestNote === 'number' ? 'press' : nearestNote?.eventType
  if (
    nearestIndex === -1 ||
    nearestError > goodWindow ||
    nearestEventType !== inputEventType
  ) {
    return {
      attempt: { ...attempt, extraHits: attempt.extraHits + 1 },
      judgment: {
        rating: 'miss',
        noteIndex: null,
        timingError: nearestError,
        timingOffset:
          nearestNoteTime === undefined ? null : tapTime - nearestNoteTime,
      },
    }
  }

  const timingOffset = tapTime - nearestNoteTime
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
  notes,
  attempt,
  defaultGoodWindow = Number.POSITIVE_INFINITY,
) {
  const judgments = [...attempt.judgments]
  const missedNoteIndexes = []

  notes.forEach((note, index) => {
    const noteTime = typeof note === 'number' ? note : note.time
    const goodWindow =
      typeof note === 'number'
        ? defaultGoodWindow
        : note.instrument.timing.goodWindow
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
