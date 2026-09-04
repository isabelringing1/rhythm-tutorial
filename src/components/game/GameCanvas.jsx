import { useEffect, useRef } from 'react'
import { Application, Graphics } from 'pixi.js'
import { PRACTICE_TIMING } from '../../game/beatTiming.js'

const FEEDBACK_COLORS = {
  perfect: 0x22c55e,
  good: 0xfacc15,
  miss: 0xef4444,
}
const BEAT_MARKER_DURATION = 0.08
const FEEDBACK_DURATION = BEAT_MARKER_DURATION

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
    let feedbackTimeRemaining = 0

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

      const circle = new Graphics()
      circle.visible = false
      app.stage.addChild(circle)

      const beatMarker = new Graphics()
        .rect(-8, -8, 16, 16)
        .fill(0x000000)
      beatMarker.visible = false
      app.stage.addChild(beatMarker)

      const calibrationPulse = new Graphics()
        .circle(0, 0, 50)
        .fill(0x999999)
      calibrationPulse.visible = false
      app.stage.addChild(calibrationPulse)

      function centerCircle() {
        circle.position.set(app.screen.width / 2, app.screen.height / 2)
        beatMarker.position.set(app.screen.width / 2 + 70, app.screen.height / 2)
        calibrationPulse.position.set(
          app.screen.width / 2,
          app.screen.height / 2,
        )
      }

      function showFeedback(nextFeedback) {
        if (!nextFeedback) {
          circle.visible = false
          return
        }

        circle
          .clear()
          .circle(0, 0, 50)
          .fill(FEEDBACK_COLORS[nextFeedback.rating])
        circle.visible = true
        feedbackTimeRemaining = FEEDBACK_DURATION
      }

      function isBeatVisible(currentTiming) {
        const playbackTime = audioEngine.getPlaybackTime({
          calibrationOffset: currentTiming.calibrationOffset,
        })
        if (playbackTime === null) return false

        const relativeTime = playbackTime - currentTiming.beatOffset
        if (relativeTime < 0) return false

        const beatDuration = 60 / currentTiming.bpm
        return relativeTime % beatDuration < BEAT_MARKER_DURATION
      }

      function updateFrame(ticker) {
        if (circle.visible) {
          feedbackTimeRemaining -= ticker.deltaMS / 1000
          if (feedbackTimeRemaining <= 0) {
            circle.visible = false
          }
        }

        calibrationPulse.visible =
          isCalibratingRef.current && isBeatVisible(PRACTICE_TIMING)

        if (!isPlayingRef.current) {
          beatMarker.visible = false
          return
        }

        const currentTiming = timingRef.current
        beatMarker.visible = isBeatVisible(currentTiming)
      }

      centerCircle()
      showFeedback(feedbackRef.current)
      app.renderer.on('resize', centerCircle)
      app.ticker.add(updateFrame)

      sceneRef.current = { centerCircle, showFeedback, updateFrame }
    }

    mountCanvas()

    return () => {
      disposed = true
      if (sceneRef.current && initialized) {
        app.renderer.off('resize', sceneRef.current.centerCircle)
        app.ticker.remove(sceneRef.current.updateFrame)
      }
      sceneRef.current = null
      if (initialized) {
        app.destroy(true, { children: true })
      }
    }
  }, [audioEngine])

  useEffect(() => {
    feedbackRef.current = feedback
    sceneRef.current?.showFeedback(feedback)
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
