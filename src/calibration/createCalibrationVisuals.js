import { Graphics } from 'pixi.js'
import { isBeatActive, PRACTICE_TIMING } from '../game/beatTiming.js'

const PULSE_DURATION = 0.08

export function createCalibrationVisuals(
  app,
  { audioEngine, getIsCalibrating },
) {
  const beatPulse = new Graphics().circle(0, 0, 50).fill(0x999999)
  beatPulse.visible = false
  app.stage.addChild(beatPulse)

  function positionPulse() {
    beatPulse.position.set(app.screen.width / 2, app.screen.height / 2)
  }

  function update() {
    if (!getIsCalibrating()) {
      beatPulse.visible = false
      return
    }

    const playbackTime = audioEngine.getPlaybackTime({
      calibrationOffset: PRACTICE_TIMING.calibrationOffset,
    })
    beatPulse.visible = isBeatActive(
      playbackTime,
      PRACTICE_TIMING,
      PULSE_DURATION,
    )
  }

  positionPulse()
  app.renderer.on('resize', positionPulse)
  app.ticker.add(update)

  return {
    destroy() {
      app.renderer.off('resize', positionPulse)
      app.ticker.remove(update)
    },
  }
}
