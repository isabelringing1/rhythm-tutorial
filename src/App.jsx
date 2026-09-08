import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import { AudioEngine } from './audio/AudioEngine.js'
import { GameCanvas } from './components/game/GameCanvas.jsx'
import { DebugMenu } from './components/ui/DebugMenu.jsx'
import { DialogueBox } from './components/ui/DialogueBox.jsx'
import { RhythmPreview } from './components/ui/RhythmPreview.jsx'
import { RoundCounter } from './components/ui/RoundCounter.jsx'
import { TimingDebug } from './components/ui/TimingDebug.jsx'
import { StartMenu } from './components/ui/StartMenu.jsx'
import { GAME_CONFIG } from './content/gameConfig.js'
import {
  calculateMedian,
  judgeBeat,
  PRACTICE_TIMING,
} from './game/beatTiming.js'
import {
  createAttempt,
  expireMissedNotes,
  finishAttempt,
  judgeChartTap,
} from './game/chartJudgment.js'
import {
  createGameFlowReducer,
  initialGameState,
} from './game/gameFlow.js'
import { getNextMeasureStart } from './game/rhythmPattern.js'

const PRACTICE_TRACK = '/audio/bottle.mp3'
const DIALOGUE_CLICK_SOUND = '/audio/click3.wav'
const PLAYER_DELAY_STORAGE_KEY = 'rhythm-player-delay-ms'
const CALIBRATION_SAMPLE_COUNT = 20
const CPU_COUNT = 2
const FIRST_CPU_MEASURE = 1
const PLAYER_MEASURE = 3
const TURN_LEAD_IN = 0.35
const gameFlowReducer = createGameFlowReducer(GAME_CONFIG)

function getInstrumentSound(instrument, eventType) {
  if (eventType === 'press') return instrument.keyPressSound
  if (eventType === 'down') return instrument.keyDownSound
  return instrument.keyUpSound
}

function getInstrumentSoundPaths(instrument) {
  return instrument.inputMode === 'keyPress'
    ? [instrument.keyPressSound]
    : [instrument.keyDownSound, instrument.keyUpSound]
}

function logOffBeatTiming(judgment) {
  if (
    judgment.rating === 'perfect' ||
    !Number.isFinite(judgment.timingOffset)
  ) {
    return
  }
  const direction = judgment.timingOffset < 0 ? 'early' : 'late'
  console.log(
    `${direction} by ${Math.abs(judgment.timingOffset * 1000).toFixed(1)}ms`,
  )
}

function loadPlayerDelay() {
  const savedDelay = Number(localStorage.getItem(PLAYER_DELAY_STORAGE_KEY))
  return Number.isFinite(savedDelay) ? savedDelay : 0
}

function App() {
  const [audioEngine] = useState(() => new AudioEngine())
  const [gameState, dispatch] = useReducer(gameFlowReducer, initialGameState)
  const [calibrationStatus, setCalibrationStatus] = useState('idle')
  const [timing, setTiming] = useState(PRACTICE_TIMING)
  const [playerDelay, setPlayerDelay] = useState(loadPlayerDelay)
  const [calibrationCount, setCalibrationCount] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const calibrationPointsRef = useRef([])
  const attemptRef = useRef(null)
  const transitionRef = useRef(null)
  const gameStateRef = useRef(gameState)
  const activeTrackStepRef = useRef(null)
  const lastStartedAttemptRef = useRef(null)
  const nextAttemptStartRef = useRef(null)

  useEffect(() => () => audioEngine.destroy(), [audioEngine])
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  const finishCalibration = useCallback(
    (points) => {
      const medianDelay = calculateMedian(points)
      localStorage.setItem(PLAYER_DELAY_STORAGE_KEY, String(medianDelay))
      setPlayerDelay(medianDelay)
      console.log(`delay: ${medianDelay.toFixed(1)}ms`)

      audioEngine.stop()
      calibrationPointsRef.current = []
      setCalibrationCount(0)
      setCalibrationStatus('idle')
    },
    [audioEngine],
  )

  useEffect(() => {
    const stepType = GAME_CONFIG.steps[gameState.stepIndex]?.type
    const isInstrumentStep = stepType === 'play' || stepType === 'try'
    if (
      !isInstrumentStep &&
      calibrationStatus !== 'calibrating'
    ) {
      return undefined
    }

    function isFormInput(event) {
      return (
        event.target instanceof HTMLElement &&
        event.target.matches('button, input, select, textarea')
      )
    }

    function handleInstrumentInput(event) {
      if (isPaused || isFormInput(event)) return

      const step = GAME_CONFIG.steps[gameState.stepIndex]
      const instrument =
        step.type === 'try'
          ? step.instrument
          : step.patterns.find(
              (pattern) => pattern.instrument.keyBinding === event.code,
            )?.instrument
      if (!instrument || event.code !== instrument.keyBinding) return

      let inputEventType
      if (instrument.inputMode === 'keyPress') {
        if (event.type !== 'keydown') return
        inputEventType = 'press'
      } else {
        inputEventType = event.type === 'keydown' ? 'down' : 'up'
      }

      event.preventDefault()
      void audioEngine.playSound(
        getInstrumentSound(instrument, inputEventType),
      )

      if (step.type === 'try') {
        dispatch({
          type: 'TRY_NOTE',
          feedback: {
            id: event.timeStamp,
            inputEventType,
            instrumentId: instrument.id,
            noteIndex: null,
            rating: 'perfect',
          },
        })
        return
      }

      const transition = transitionRef.current
      const playbackTime = audioEngine.getPlaybackTime({
        calibrationOffset:
          step.timing.calibrationOffset - playerDelay / 1000,
      })
      const isPlayerWindow =
        transition !== null &&
        playbackTime !== null &&
        playbackTime >=
          transition.playerStart - instrument.timing.goodWindow &&
        playbackTime < transition.playerEnd

      if (!isPlayerWindow) {
        dispatch({
          type: 'FEEDBACK',
          feedback: {
            id: event.timeStamp,
            inputEventType,
            instrumentId: instrument.id,
            noteIndex: null,
            rating: 'miss',
            timingError: Number.POSITIVE_INFINITY,
            timingOffset: null,
          },
        })
        return
      }

      const tapTime = playbackTime - transition.playerStart
      const result = judgeChartTap(
        tapTime,
        transition.notes,
        attemptRef.current,
        instrument.timing,
        inputEventType,
        instrument.id,
      )
      logOffBeatTiming(result.judgment)
      attemptRef.current = result.attempt
      dispatch({
        type: 'FEEDBACK',
        feedback: {
          ...result.judgment,
          id: event.timeStamp,
          inputEventType,
          instrumentId: instrument.id,
        },
      })
    }

    function handleKeyDown(event) {
      if (event.repeat) return
      if (isFormInput(event)) return

      if (calibrationStatus === 'calibrating') {
        if (event.code !== 'Space') return
        event.preventDefault()

        const playbackTime = audioEngine.getPlaybackTime({
          calibrationOffset: PRACTICE_TIMING.calibrationOffset,
        })
        if (playbackTime === null) return

        const judgment = judgeBeat(playbackTime, PRACTICE_TIMING)
        const delay = judgment.timingOffset * 1000
        const points = [...calibrationPointsRef.current, delay]

        calibrationPointsRef.current = points
        setCalibrationCount(points.length)
        console.log(`${points.length}:${delay.toFixed(1)}ms`)

        if (points.length === CALIBRATION_SAMPLE_COUNT) {
          finishCalibration(points)
        }
        return
      }

      handleInstrumentInput(event)
    }

    function handleKeyUp(event) {
      if (calibrationStatus === 'calibrating') return
      handleInstrumentInput(event)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [
    audioEngine,
    calibrationStatus,
    finishCalibration,
    gameState.mode,
    gameState.playerTurn,
    gameState.stepIndex,
    isPaused,
    playerDelay,
  ])

  useEffect(() => {
    let animationFrame

    function updateTurn() {
      const transition = transitionRef.current
      const state = gameStateRef.current
      if (transition && !isPaused) {
        const playbackTime = audioEngine.getPlaybackTime()
        if (
          playbackTime !== null &&
          state.mode === 'cpuTurn' &&
          playbackTime >= transition.playerStart
        ) {
          dispatch({
            type: 'PLAYER_TURN',
            performance: transition.performance,
            playerTurn: {
              startTime: transition.playerStart,
              endTime: transition.playerEnd,
            },
          })
        } else if (playbackTime !== null && state.mode === 'playerTurn') {
          const step = GAME_CONFIG.steps[state.stepIndex]
          const judgedPlaybackTime = audioEngine.getPlaybackTime({
            calibrationOffset:
              step.timing.calibrationOffset - playerDelay / 1000,
          })
          if (judgedPlaybackTime !== null) {
            const expiration = expireMissedNotes(
              judgedPlaybackTime - transition.playerStart,
              transition.notes,
              attemptRef.current,
            )
            attemptRef.current = expiration.attempt
            if (expiration.missedNoteIndexes.length > 0) {
              dispatch({
                type: 'FEEDBACK',
                feedback: {
                  id: `miss-${expiration.missedNoteIndexes.join('-')}-${performance.now()}`,
                  rating: 'miss',
                },
              })
            }
          }

          if (playbackTime >= transition.playerEnd) {
            const finalExpiration = expireMissedNotes(
              Number.POSITIVE_INFINITY,
              transition.notes,
              attemptRef.current,
            )
            attemptRef.current = finalExpiration.attempt
            if (finalExpiration.missedNoteIndexes.length > 0) {
              dispatch({
                type: 'FEEDBACK',
                feedback: {
                  id: `final-miss-${performance.now()}`,
                  rating: 'miss',
                },
              })
            }
            const result = finishAttempt(attemptRef.current)
            nextAttemptStartRef.current = transition.playerEnd
            transitionRef.current = null
            dispatch({
              type: 'ATTEMPT_RESULT',
              isPerfect: result.isPerfect,
              feedback: result.isPerfect
                ? {
                    id: `result-${performance.now()}`,
                    rating: 'perfect',
                  }
                : undefined,
            })
          }
        }
      }
      animationFrame = requestAnimationFrame(updateTurn)
    }

    animationFrame = requestAnimationFrame(updateTurn)
    return () => cancelAnimationFrame(animationFrame)
  }, [audioEngine, isPaused, playerDelay])

  useEffect(() => {
    if (gameState.mode !== 'try') return
    let cancelled = false
    const step = GAME_CONFIG.steps[gameState.stepIndex]

    void audioEngine
      .preload(getInstrumentSoundPaths(step.instrument))
      .catch((error) => {
        if (cancelled) return
        console.error(error)
        dispatch({
          type: 'FAIL',
          error:
            error instanceof Error
              ? error.message
              : 'Unable to load the instrument',
        })
      })

    return () => {
      cancelled = true
    }
  }, [audioEngine, gameState.mode, gameState.stepIndex])

  useEffect(() => {
    if (gameState.mode !== 'try' || gameState.remainingNotes !== 0) return
    const timeout = window.setTimeout(() => {
      dispatch({ type: 'TRY_COMPLETE' })
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [gameState.mode, gameState.remainingNotes])

  useEffect(() => {
    if (gameState.mode !== 'loadingPlay') return
    const attemptKey = `${gameState.stepIndex}:${gameState.attemptNumber}`
    if (lastStartedAttemptRef.current === attemptKey) return
    lastStartedAttemptRef.current = attemptKey
    let cancelled = false

    async function prepareAttempt() {
      const step = GAME_CONFIG.steps[gameState.stepIndex]
      try {
        if (activeTrackStepRef.current !== gameState.stepIndex) {
          audioEngine.stopTrack()
          await audioEngine.preload([
            step.backingTrack,
            ...step.patterns.flatMap(({ instrument }) =>
              getInstrumentSoundPaths(instrument),
            ),
          ])
          await audioEngine.startTrack(step.backingTrack, { loop: true })
          activeTrackStepRef.current = gameState.stepIndex
        }
        if (cancelled) return

        const now = audioEngine.getPlaybackTime({ compensateLatency: false })
        const turnDuration = step.chart.duration
        const firstTurnStart =
          nextAttemptStartRef.current ??
          getNextMeasureStart(now ?? 0, {
            beatOffset: timing.beatOffset,
            measureDuration: step.chart.duration,
            minimumLead: TURN_LEAD_IN,
          })
        nextAttemptStartRef.current = null
        const cpuTurns = Array.from({ length: CPU_COUNT }, (_, character) => ({
          character: character + FIRST_CPU_MEASURE,
          startTime:
            firstTurnStart +
            (character + FIRST_CPU_MEASURE) * turnDuration,
          endTime:
            firstTurnStart +
            (character + FIRST_CPU_MEASURE) * turnDuration +
            step.chart.duration,
        }))
        const playerStart = firstTurnStart + PLAYER_MEASURE * turnDuration
        const playerEnd = playerStart + step.chart.duration
        const performanceData = {
          cpuTurns,
          instruments: step.patterns.map(({ instrument }) => instrument),
          notes: step.chart.notes,
          playerStart,
          playerEnd,
          poseDuration: step.poseDuration,
        }

        await Promise.all(
          cpuTurns.flatMap((turn) =>
            step.chart.notes.map((note) =>
              audioEngine.scheduleSound(
                getInstrumentSound(note.instrument, note.eventType),
                turn.startTime + note.time,
              ),
            ),
          ),
        )
        if (cancelled) return

        transitionRef.current = {
          performance: performanceData,
          playerStart,
          playerEnd,
          noteCount: step.chart.notes.length,
          notes: step.chart.notes,
        }
        attemptRef.current = createAttempt(step.chart.notes.length)
        dispatch({ type: 'PLAY_READY', performance: performanceData })
      } catch (error) {
        console.error(error)
        dispatch({
          type: 'FAIL',
          error:
            error instanceof Error ? error.message : 'Unable to start the game',
        })
      }
    }

    void prepareAttempt()
    return () => {
      cancelled = true
    }
  }, [
    audioEngine,
    gameState.attemptNumber,
    gameState.mode,
    gameState.stepIndex,
    timing.beatOffset,
  ])

  useEffect(() => {
    if (gameState.mode !== 'roundResult') return undefined
    const timeout = window.setTimeout(() => {
      if (gameState.remainingSuccesses === 0) {
        audioEngine.stop()
        activeTrackStepRef.current = null
        dispatch({ type: 'PLAY_COMPLETE' })
      } else {
        dispatch({ type: 'RETRY' })
      }
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [
    audioEngine,
    gameState.mode,
    gameState.remainingSuccesses,
  ])

  useEffect(() => {
    if (
      gameState.mode === 'dialogue' ||
      gameState.mode === 'try' ||
      gameState.mode === 'complete'
    ) {
      audioEngine.stopTrack()
      activeTrackStepRef.current = null
      transitionRef.current = null
      nextAttemptStartRef.current = null
    }
  }, [audioEngine, gameState.mode])

  function handleStart() {
    setIsPaused(false)
    void audioEngine.preload([DIALOGUE_CLICK_SOUND]).catch(console.error)
    dispatch({ type: 'START' })
  }

  function handleAdvanceDialogue() {
    void audioEngine.playSound(DIALOGUE_CLICK_SOUND).catch(console.error)
    dispatch({ type: 'NEXT_DIALOGUE' })
  }

  async function handleCalibrate() {
    handleReset()
    setCalibrationStatus('loading')
    setCalibrationCount(0)
    calibrationPointsRef.current = []

    try {
      await audioEngine.play(PRACTICE_TRACK, {
        onEnded: () => {
          calibrationPointsRef.current = []
          setCalibrationCount(0)
          setCalibrationStatus('idle')
        },
      })
      setCalibrationStatus('calibrating')
    } catch (playbackError) {
      console.error(playbackError)
      setCalibrationStatus('idle')
    }
  }

  async function handleTogglePause() {
    if (!isPaused) {
      await audioEngine.pause()
      setIsPaused(true)
    } else {
      await audioEngine.resume()
      setIsPaused(false)
    }
  }

  function handleReset() {
    audioEngine.stop()
    activeTrackStepRef.current = null
    lastStartedAttemptRef.current = null
    transitionRef.current = null
    nextAttemptStartRef.current = null
    setIsPaused(false)
    dispatch({ type: 'RESET' })
  }

  function handleSkipStep() {
    audioEngine.stop()
    activeTrackStepRef.current = null
    transitionRef.current = null
    nextAttemptStartRef.current = null
    setIsPaused(false)
    dispatch({ type: 'SKIP_STEP' })
  }

  function handleGoToStep(stepNumber) {
    if (
      !Number.isInteger(stepNumber) ||
      stepNumber < 1 ||
      stepNumber > GAME_CONFIG.steps.length
    ) {
      return
    }

    audioEngine.stop()
    activeTrackStepRef.current = null
    lastStartedAttemptRef.current = null
    transitionRef.current = null
    nextAttemptStartRef.current = null
    setIsPaused(false)
    dispatch({ type: 'GOTO_STEP', stepIndex: stepNumber - 1 })
  }

  const activeStep = GAME_CONFIG.steps[gameState.stepIndex]
  const previousStep = GAME_CONFIG.steps
    .slice(0, gameState.stepIndex)
    .findLast((step) => step.type !== 'flag')
  const dialogueCharacterStates =
    gameState.mode === 'dialogue'
      ? (activeStep.lineToCharacterState?.[gameState.dialogueLine] ?? null)
      : null
  const stickyDialogueText =
    (activeStep?.type === 'play' || activeStep?.type === 'try') &&
    previousStep?.type === 'dialogue' &&
    previousStep.lastLineStick
      ? previousStep.lines.findLast(
          (_, lineIndex) => !previousStep.lineFlags[lineIndex],
        )
      : null
  const isPlaying =
    gameState.mode === 'cpuTurn' ||
    gameState.mode === 'playerTurn' ||
    gameState.mode === 'roundResult'
  const showCharacters =
    gameState.mode !== 'menu' &&
    gameState.mode !== 'complete' &&
    gameState.mode !== 'error' &&
    calibrationStatus === 'idle'

  return (
    <main className="app-shell">
      <GameCanvas
        audioEngine={audioEngine}
        dialogueCharacterStates={dialogueCharacterStates}
        feedback={gameState.feedback}
        flags={gameState.flags}
        isCalibrating={calibrationStatus === 'calibrating'}
        isPlaying={isPlaying && !isPaused}
        performance={gameState.performance}
        showCharacters={showCharacters}
        timing={timing}
      />
      {calibrationStatus === 'calibrating' && (
        <p className="calibration-instruction">
          Press the space bar to the beat ({calibrationCount}/
          {CALIBRATION_SAMPLE_COUNT})
        </p>
      )}
      {calibrationStatus === 'idle' && (
        <StartMenu
          onCalibrate={handleCalibrate}
          onStart={handleStart}
          showStart={gameState.mode === 'menu'}
        />
      )}
      {gameState.mode === 'dialogue' && (
        <DialogueBox
          text={activeStep.lines[gameState.dialogueLine]}
          onAdvance={handleAdvanceDialogue}
        />
      )}
      {stickyDialogueText && (
        <DialogueBox text={stickyDialogueText} isPersistent />
      )}
      {activeStep?.type === 'play' && isPlaying && (
        <RoundCounter
          remaining={gameState.remainingSuccesses}
          result={
            gameState.mode === 'roundResult'
              ? gameState.feedback?.rating
              : null
          }
        />
      )}
      {gameState.mode === 'complete' && (
        <div className="completion-panel">
          <p>All done!</p>
          <button type="button" onClick={handleReset}>
            Play again
          </button>
        </div>
      )}
      {gameState.mode === 'error' && (
        <div className="completion-panel" role="alert">
          <p>{gameState.error}</p>
          <button type="button" onClick={handleReset}>
            Back
          </button>
        </div>
      )}
      {import.meta.env.DEV &&
        gameState.mode !== 'menu' &&
        gameState.mode !== 'complete' &&
        gameState.mode !== 'error' && (
          <div className="game-debug-tools">
            {activeStep?.type === 'play' && (
              <RhythmPreview patterns={activeStep.patterns} />
            )}
            <DebugMenu
              currentStep={gameState.stepIndex + 1}
              onGoToStep={handleGoToStep}
              onSkip={handleSkipStep}
              totalSteps={GAME_CONFIG.steps.length}
            />
          </div>
        )}
      <TimingDebug
        canPause={
          gameState.mode === 'cpuTurn' || gameState.mode === 'playerTurn'
        }
        isPaused={isPaused}
        playerDelay={playerDelay}
        timing={timing}
        onChange={setTiming}
        onTogglePause={handleTogglePause}
      />
    </main>
  )
}

export default App
