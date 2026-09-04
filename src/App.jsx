import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioEngine } from './audio/AudioEngine.js'
import { GameCanvas } from './components/game/GameCanvas.jsx'
import { TimingDebug } from './components/ui/TimingDebug.jsx'
import { StartMenu } from './components/ui/StartMenu.jsx'
import {
  calculateMedian,
  judgeBeat,
  PRACTICE_TIMING,
} from './game/beatTiming.js'

const PRACTICE_TRACK = '/audio/practice.mp3'
const PLAYER_DELAY_STORAGE_KEY = 'rhythm-player-delay-ms'
const CALIBRATION_SAMPLE_COUNT = 20

function loadPlayerDelay() {
  const savedDelay = Number(localStorage.getItem(PLAYER_DELAY_STORAGE_KEY))
  return Number.isFinite(savedDelay) ? savedDelay : 0
}

function App() {
  const [audioEngine] = useState(() => new AudioEngine())
  const [status, setStatus] = useState('idle')
  const [hitFeedback, setHitFeedback] = useState(null)
  const [timing, setTiming] = useState(PRACTICE_TIMING)
  const [playerDelay, setPlayerDelay] = useState(loadPlayerDelay)
  const [calibrationCount, setCalibrationCount] = useState(0)
  const calibrationPointsRef = useRef([])

  useEffect(() => () => audioEngine.destroy(), [audioEngine])

  const finishCalibration = useCallback(
    (points) => {
      const medianDelay = calculateMedian(points)
      localStorage.setItem(PLAYER_DELAY_STORAGE_KEY, String(medianDelay))
      setPlayerDelay(medianDelay)
      console.log(`delay: ${medianDelay.toFixed(1)}ms`)

      audioEngine.stop()
      calibrationPointsRef.current = []
      setCalibrationCount(0)
      setStatus('idle')
    },
    [audioEngine],
  )

  useEffect(() => {
    if (status !== 'playing' && status !== 'calibrating') return undefined

    function handleKeyDown(event) {
      if (event.repeat) return
      if (
        event.target instanceof HTMLElement &&
        event.target.matches('button, input, select, textarea')
      ) {
        return
      }

      if (status === 'calibrating') {
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

      const playbackTime = audioEngine.getPlaybackTime({
        calibrationOffset:
          timing.calibrationOffset - playerDelay / 1000,
      })
      if (playbackTime === null) return

      const judgment = judgeBeat(playbackTime, timing)
      console.log(
        `Beat offset: ${(judgment.timingOffset * 1000).toFixed(1)} ms`,
      )

      setHitFeedback({
        ...judgment,
        id: event.timeStamp,
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [audioEngine, finishCalibration, playerDelay, status, timing])

  async function handleStart() {
    setStatus('loading')
    setHitFeedback(null)

    try {
      await audioEngine.play(PRACTICE_TRACK, {
        onEnded: () => {
          setStatus('idle')
          setHitFeedback(null)
        },
      })
      setStatus('playing')
    } catch (playbackError) {
      console.error(playbackError)
      setStatus('idle')
    }
  }

  async function handleCalibrate() {
    setStatus('calibration-loading')
    setHitFeedback(null)
    setCalibrationCount(0)
    calibrationPointsRef.current = []

    try {
      await audioEngine.play(PRACTICE_TRACK, {
        onEnded: () => {
          calibrationPointsRef.current = []
          setCalibrationCount(0)
          setStatus('idle')
        },
      })
      setStatus('calibrating')
    } catch (playbackError) {
      console.error(playbackError)
      setStatus('idle')
    }
  }

  async function handleTogglePause() {
    if (status === 'playing') {
      await audioEngine.pause()
      setStatus('paused')
    } else if (status === 'paused') {
      await audioEngine.resume()
      setStatus('playing')
    }
  }

  return (
    <main className="app-shell">
      <GameCanvas
        audioEngine={audioEngine}
        feedback={hitFeedback}
        isCalibrating={status === 'calibrating'}
        isPlaying={status === 'playing'}
        timing={timing}
      />
      {status === 'calibrating' && (
        <p className="calibration-instruction">
          Press the space bar to the beat ({calibrationCount}/
          {CALIBRATION_SAMPLE_COUNT})
        </p>
      )}
      {status === 'idle' && (
        <StartMenu
          onCalibrate={handleCalibrate}
          onStart={handleStart}
        />
      )}
      <TimingDebug
        canPause={status === 'playing' || status === 'paused'}
        isPaused={status === 'paused'}
        playerDelay={playerDelay}
        timing={timing}
        onChange={setTiming}
        onTogglePause={handleTogglePause}
      />
    </main>
  )
}

export default App
