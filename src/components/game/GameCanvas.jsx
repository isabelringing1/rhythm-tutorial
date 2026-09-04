import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { createCalibrationVisuals } from '../../calibration/createCalibrationVisuals.js'
import { createGameVisuals } from '../../game/createGameVisuals.js'

export function GameCanvas({
  audioEngine,
  feedback,
  isCalibrating,
  isPlaying,
  timing,
}) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const feedbackRef = useRef(feedback)
  const isCalibratingRef = useRef(isCalibrating)
  const isPlayingRef = useRef(isPlaying)
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

      sceneRef.current = {
        calibration: createCalibrationVisuals(app, {
          audioEngine,
          getIsCalibrating: () => isCalibratingRef.current,
        }),
        game: createGameVisuals(app, {
          audioEngine,
          getFeedback: () => feedbackRef.current,
          getIsPlaying: () => isPlayingRef.current,
          getTiming: () => timingRef.current,
        }),
      }
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
    feedbackRef.current = feedback
    sceneRef.current?.game.showFeedback(feedback)
  }, [feedback])

  useEffect(() => {
    isCalibratingRef.current = isCalibrating
  }, [isCalibrating])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    timingRef.current = timing
  }, [timing])

  return <div ref={containerRef} className="game-canvas" aria-hidden="true" />
}
