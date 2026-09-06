import { Assets, Container, Sprite, Text } from 'pixi.js'

const CHARACTER_SLOTS = [1, 2, 3]
const TOTAL_SLOT_COUNT = 4
const PLAYER_SLOT = 3
const MAD_DURATION = 0.75
const HAPPY_DURATION = 1
const SMOOTH_TEXTURE_OPTIONS = {
  autoGenerateMipmaps: true,
  scaleMode: 'linear',
}

function loadCharacterTexture(src) {
  return Assets.load({
    src,
    data: SMOOTH_TEXTURE_OPTIONS,
  })
}

export async function createGameVisuals(
  app,
  {
    audioEngine,
    getFeedback,
    getIsPlaying,
    getPerformance,
    getShowCharacters,
  },
) {
  const [defaultTexture, bellTexture, madTexture, happyTexture] =
    await Promise.all([
      loadCharacterTexture('/sprites/guy/default.png'),
      loadCharacterTexture('/sprites/guy/bell.png'),
      loadCharacterTexture('/sprites/guy/mad.png'),
      loadCharacterTexture('/sprites/guy/happy.png'),
    ])
  const characterLayer = new Container()
  const characters = CHARACTER_SLOTS.map((slot) => {
    const container = new Container()
    const sprite = new Sprite(defaultTexture)
    sprite.anchor.set(0.5)
    container.addChild(sprite)
    if (slot === PLAYER_SLOT) {
      const label = new Text({
        text: 'You',
        style: {
          fill: 0x000000,
          fontFamily: 'Arial, sans-serif',
          fontSize: 22,
        },
      })
      label.anchor.set(0.5, 1)
      container.addChild(label)
      return { container, label, slot, sprite }
    }
    return { container, label: null, slot, sprite }
  })
  let playerPoseTimeRemaining = 0
  let cpuMadTimeRemaining = 0
  let happyTimeRemaining = 0

  characters.forEach(({ container }) => characterLayer.addChild(container))
  app.stage.addChild(characterLayer)

  function positionVisuals() {
    const spriteSize = 220;
    const spacing = spriteSize * 0.65
    const rightMargin = app.screen.height * 0.2
    const rightmostX = app.screen.width - rightMargin - spriteSize / 2
    const startX = rightmostX - spacing * (TOTAL_SLOT_COUNT - 1)
    const centerY = app.screen.height - app.screen.height * 0.4

    characters.forEach(({ container, label, slot, sprite }) => {
      container.position.set(startX + spacing * slot, centerY)
      sprite.width = spriteSize
      sprite.height = spriteSize
      if (label) label.position.set(0, -spriteSize * 0.52)
    })
  }

  function showFeedback(feedback) {
    if (!feedback) return
    if (feedback.noteIndex !== undefined) {
      playerPoseTimeRemaining = getPerformance()?.poseDuration ?? 0.12
    }
    if (feedback.rating !== 'perfect') {
      cpuMadTimeRemaining = MAD_DURATION
    } else if (feedback.noteIndex === undefined) {
      happyTimeRemaining = HAPPY_DURATION
    }
  }

  function update(ticker) {
    characterLayer.visible = getShowCharacters()
    if (!characterLayer.visible) return

    if (playerPoseTimeRemaining > 0) {
      playerPoseTimeRemaining -= ticker.deltaMS / 1000
    }
    if (cpuMadTimeRemaining > 0) {
      cpuMadTimeRemaining -= ticker.deltaMS / 1000
    }
    if (happyTimeRemaining > 0) {
      happyTimeRemaining -= ticker.deltaMS / 1000
    }

    const active = Array(TOTAL_SLOT_COUNT).fill(false)
    const performance = getPerformance()
    if (getIsPlaying() && performance) {
      const playbackTime = audioEngine.getPlaybackTime()
      performance.cpuTurns.forEach((turn) => {
        active[turn.character] = performance.notes.some(
          (note) =>
            playbackTime >= turn.startTime + note.time &&
            playbackTime <
              turn.startTime + note.time + performance.poseDuration,
        )
      })
    }
    active[PLAYER_SLOT] = playerPoseTimeRemaining > 0
    characters.forEach(({ slot, sprite }) => {
      if (happyTimeRemaining > 0) {
        sprite.texture = happyTexture
      } else if (slot < PLAYER_SLOT && cpuMadTimeRemaining > 0) {
        sprite.texture = madTexture
      } else {
        sprite.texture = active[slot] ? bellTexture : defaultTexture
      }
    })
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
      characterLayer.destroy({ children: true })
    },
  }
}
