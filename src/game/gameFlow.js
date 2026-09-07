export const initialGameState = Object.freeze({
  mode: 'menu',
  stepIndex: 0,
  dialogueLine: 0,
  remainingSuccesses: 0,
  remainingNotes: 0,
  attemptNumber: 0,
  feedback: null,
  performance: null,
  playerTurn: null,
  error: null,
  flags: Object.freeze({}),
})

function applyFlag(state, flag) {
  return {
    ...state,
    flags: {
      ...state.flags,
      [flag.id]: flag.value,
    },
  }
}

function enterStep(state, config, initialStepIndex, initialDialogueLine = 0) {
  let nextState = state
  let stepIndex = initialStepIndex
  let dialogueLine = initialDialogueLine

  while (stepIndex < config.steps.length) {
    const step = config.steps[stepIndex]
    if (step.type === 'flag') {
      nextState = applyFlag(nextState, step)
      stepIndex += 1
      dialogueLine = 0
      continue
    }

    if (step.type === 'dialogue') {
      while (dialogueLine < step.lines.length && step.lineFlags?.[dialogueLine]) {
        nextState = applyFlag(nextState, step.lineFlags[dialogueLine])
        dialogueLine += 1
      }
      if (dialogueLine >= step.lines.length) {
        stepIndex += 1
        dialogueLine = 0
        continue
      }

      return {
        ...nextState,
        mode: 'dialogue',
        stepIndex,
        dialogueLine,
        remainingNotes: 0,
        feedback: null,
        performance: null,
        playerTurn: null,
      }
    }

    if (step.type === 'try') {
      return {
        ...nextState,
        mode: 'try',
        stepIndex,
        remainingNotes: step.numNotes,
        feedback: null,
        performance: { instrument: step.instrument },
        playerTurn: null,
      }
    }

    return {
      ...nextState,
      mode: 'loadingPlay',
      stepIndex,
      remainingSuccesses: step.requiredSuccesses,
      remainingNotes: 0,
      attemptNumber: 0,
      feedback: null,
      performance: null,
      playerTurn: null,
    }
  }

  return {
    ...nextState,
    mode: 'complete',
    stepIndex: config.steps.length,
    remainingNotes: 0,
    feedback: null,
    performance: null,
    playerTurn: null,
  }
}

function skipStep(state, config) {
  if (
    state.mode === 'menu' ||
    state.mode === 'complete' ||
    state.mode === 'error'
  ) {
    return state
  }

  let nextState = state
  const step = config.steps[state.stepIndex]
  if (step.type === 'dialogue') {
    for (
      let lineIndex = state.dialogueLine + 1;
      lineIndex < step.lines.length;
      lineIndex += 1
    ) {
      if (step.lineFlags?.[lineIndex]) {
        nextState = applyFlag(nextState, step.lineFlags[lineIndex])
      }
    }
  }

  return enterStep(nextState, config, state.stepIndex + 1)
}

export function createGameFlowReducer(config) {
  return function gameFlowReducer(state, action) {
    switch (action.type) {
      case 'START':
        return enterStep({ ...initialGameState }, config, 0)
      case 'NEXT_DIALOGUE':
        if (state.mode !== 'dialogue') return state
        return enterStep(
          state,
          config,
          state.stepIndex,
          state.dialogueLine + 1,
        )
      case 'PLAY_READY':
        return {
          ...state,
          mode: 'cpuTurn',
          performance: action.performance,
          error: null,
        }
      case 'PLAYER_TURN':
        return {
          ...state,
          mode: 'playerTurn',
          performance: action.performance,
          playerTurn: action.playerTurn,
          feedback: null,
        }
      case 'FEEDBACK':
        return { ...state, feedback: action.feedback }
      case 'TRY_NOTE':
        if (state.mode !== 'try' || state.remainingNotes <= 0) return state
        return {
          ...state,
          remainingNotes: state.remainingNotes - 1,
          feedback: action.feedback,
        }
      case 'TRY_COMPLETE':
        if (state.mode !== 'try' || state.remainingNotes !== 0) return state
        return enterStep(state, config, state.stepIndex + 1)
      case 'ATTEMPT_RESULT': {
        const remainingSuccesses = action.isPerfect
          ? state.remainingSuccesses - 1
          : state.remainingSuccesses
        return {
          ...state,
          mode: 'roundResult',
          remainingSuccesses,
          feedback: action.feedback ?? state.feedback,
          playerTurn: null,
        }
      }
      case 'RETRY':
        return {
          ...state,
          mode: 'loadingPlay',
          attemptNumber: state.attemptNumber + 1,
          feedback: null,
          performance: null,
        }
      case 'PLAY_COMPLETE':
        return enterStep(state, config, state.stepIndex + 1)
      case 'SKIP_STEP':
        return skipStep(state, config)
      case 'FAIL':
        return {
          ...initialGameState,
          mode: 'error',
          error: action.error,
        }
      case 'RESET':
        return { ...initialGameState }
      default:
        return state
    }
  }
}
