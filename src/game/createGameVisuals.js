import { Graphics } from 'pixi.js'
import { isBeatActive } from './beatTiming.js'

const FEEDBACK_COLORS = {
  perfect: 0x22c55e,
  good: 0xfacc15,
  miss: 0xef4444,
}
const VISUAL_DURATION = 0.08

export function createGameVisuals(
  app,
  { audioEngine, getFeedback, getIsPlaying, getTiming },
) {
  const feedbackCircle = new Graphics()
  const beatMarker = new Graphics().rect(-8, -8, 16, 16).fill(0x000000)
  let feedbackTimeRemaining = 0

  feedbackCircle.visible = false
  beatMarker.visible = false
  app.stage.addChild(feedbackCircle, beatMarker)

  function positionVisuals() {
    feedbackCircle.position.set(app.screen.width / 2, app.screen.height / 2)
    beatMarker.position.set(app.screen.width / 2 + 70, app.screen.height / 2)
  }

  function showFeedback(feedback) {
    if (!feedback) {
      feedbackCircle.visible = false
      return
    }

    feedbackCircle
      .clear()
      .circle(0, 0, 50)
      .fill(FEEDBACK_COLORS[feedback.rating])
    feedbackCircle.visible = true
    feedbackTimeRemaining = VISUAL_DURATION
  }

  function update(ticker) {
    if (feedbackCircle.visible) {
      feedbackTimeRemaining -= ticker.deltaMS / 1000
      if (feedbackTimeRemaining <= 0) {
        feedbackCircle.visible = false
      }
    }

    if (!getIsPlaying()) {
      beatMarker.visible = false
      return
    }

    const timing = getTiming()
    const playbackTime = audioEngine.getPlaybackTime({
      calibrationOffset: timing.calibrationOffset,
    })
    beatMarker.visible = isBeatActive(
      playbackTime,
      timing,
      VISUAL_DURATION,
    )
  }

  positionVisuals()
  showFeedback(getFeedback())
  app.renderer.on('resize', positionVisuals)
  app.ticker.add(update)

  return {
    showFeedback,
    destroy() {
      app.renderer.off('resize', positionVisuals)
      app.ticker.remove(update)
    },
  }
}
