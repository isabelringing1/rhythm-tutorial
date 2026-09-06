export const initialGameState = Object.freeze({
  mode: 'menu',
  stepIndex: 0,
  dialogueLine: 0,
  remainingSuccesses: 0,
  attemptNumber: 0,
  feedback: null,
  performance: null,
  playerTurn: null,
  error: null,
})

function enterStep(state, config, stepIndex) {
  if (stepIndex >= config.steps.length) {
    return { ...initialGameState, mode: 'complete' }
  }

  const step = config.steps[stepIndex]
  if (step.type === 'dialogue') {
    return {
      ...state,
      mode: 'dialogue',
      stepIndex,
      dialogueLine: 0,
      feedback: null,
      performance: null,
      playerTurn: null,
    }
  }

  return {
    ...state,
    mode: 'loadingPlay',
    stepIndex,
    remainingSuccesses: step.requiredSuccesses,
    attemptNumber: 0,
    feedback: null,
    performance: null,
    playerTurn: null,
  }
}

export function createGameFlowReducer(config) {
  return function gameFlowReducer(state, action) {
    const step = config.steps[state.stepIndex]

    switch (action.type) {
      case 'START':
        return enterStep(state, config, 0)
      case 'NEXT_DIALOGUE':
        if (state.mode !== 'dialogue') return state
        if (state.dialogueLine < step.lines.length - 1) {
          return { ...state, dialogueLine: state.dialogueLine + 1 }
        }
        return enterStep(state, config, state.stepIndex + 1)
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
