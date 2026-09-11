import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { createCalibrationVisuals } from '../../calibration/createCalibrationVisuals.js'
import { createGameVisuals } from '../../game/createGameVisuals.js'

export function GameCanvas({
  audioEngine,
  dialogueCharacterStates,
  feedback,
  flags,
  isCalibrating,
  isPlaying,
  performance,
  playerVoiceState,
  showCharacters,
  timing,
}) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const dialogueCharacterStatesRef = useRef(dialogueCharacterStates)
  const feedbackRef = useRef(feedback)
  const flagsRef = useRef(flags)
  const isCalibratingRef = useRef(isCalibrating)
  const isPlayingRef = useRef(isPlaying)
  const performanceRef = useRef(performance)
  const playerVoiceStateRef = useRef(playerVoiceState)
  const showCharactersRef = useRef(showCharacters)
  const timingRef = useRef(timing)

  useEffect(() => {
    const container = containerRef.current
    const app = new Application()
    let disposed = false
    let initialized = false

    async function mountCanvas() {
      await app.init({
        antialias: true,
        backgroundAlpha: 0,
        resizeTo: container,
      })
      initialized = true

      if (disposed) {
        app.destroy()
        return
      }

      container.appendChild(app.canvas)

      const calibration = createCalibrationVisuals(app, {
        audioEngine,
        getIsCalibrating: () => isCalibratingRef.current,
      })
      const game = await createGameVisuals(app, {
          audioEngine,
        getDialogueCharacterStates: () => dialogueCharacterStatesRef.current,
          getFeedback: () => feedbackRef.current,
        getFlags: () => flagsRef.current,
          getIsPlaying: () => isPlayingRef.current,
          getPerformance: () => performanceRef.current,
          getPlayerVoiceState: () => playerVoiceStateRef.current,
          getShowCharacters: () => showCharactersRef.current,
        })
      if (disposed) {
        calibration.destroy()
        game.destroy()
        app.destroy(true, { children: true })
        return
      }
      sceneRef.current = { calibration, game }
    }

    mountCanvas()

    return () => {
      disposed = true
      sceneRef.current?.calibration.destroy()
      sceneRef.current?.game.destroy()
      sceneRef.current = null
      if (initialized) {
        app.destroy(true, { children: true })
      }
    }
  }, [audioEngine])

  useEffect(() => {
    dialogueCharacterStatesRef.current = dialogueCharacterStates
    sceneRef.current?.game.showDialogueCharacterStates(dialogueCharacterStates)
  }, [dialogueCharacterStates])

  useEffect(() => {
    feedbackRef.current = feedback
    sceneRef.current?.game.showFeedback(feedback)
  }, [feedback])

  useEffect(() => {
    flagsRef.current = flags
    sceneRef.current?.game.setFlags(flags)
  }, [flags])

  useEffect(() => {
    isCalibratingRef.current = isCalibrating
  }, [isCalibrating])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    performanceRef.current = performance
  }, [performance])

  useEffect(() => {
    playerVoiceStateRef.current = playerVoiceState
    sceneRef.current?.game.setPlayerVoiceState(playerVoiceState)
  }, [playerVoiceState])

  useEffect(() => {
    showCharactersRef.current = showCharacters
  }, [showCharacters])

  useEffect(() => {
    timingRef.current = timing
  }, [timing])

  return <div ref={containerRef} className="game-canvas" aria-hidden="true" />
}
