import { Assets, Container, Text } from 'pixi.js'
import { GUY_VISUAL_CONFIG } from '../content/characterVisualConfig.js'
import {
  createLayeredCharacter,
  getCharacterTextureSources,
} from './createLayeredCharacter.js'

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
  const textureSources = getCharacterTextureSources(GUY_VISUAL_CONFIG)
  const loadedTextures = await Promise.all(
    textureSources.map(loadCharacterTexture),
  )
  const textures = new Map(
    textureSources.map((src, index) => [src, loadedTextures[index]]),
  )
  const characterLayer = new Container()
  const characters = CHARACTER_SLOTS.map((slot) => {
    const visual = createLayeredCharacter(GUY_VISUAL_CONFIG, textures)
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
      visual.container.addChild(label)
      return { label, slot, visual }
    }
    return { label: null, slot, visual }
  })
  const charactersBySlot = new Map(
    characters.map((character) => [character.slot, character]),
  )
  let activeCpuPoses = new Set()

  characters.forEach(({ visual }) => characterLayer.addChild(visual.container))
  app.stage.addChild(characterLayer)

  function positionVisuals() {
    const spriteSize = 220
    const spacing = spriteSize * 0.65
    const rightMargin = app.screen.height * 0.2
    const rightmostX = app.screen.width - rightMargin - spriteSize / 2
    const startX = rightmostX - spacing * (TOTAL_SLOT_COUNT - 1)
    const centerY = app.screen.height - app.screen.height * 0.4

    characters.forEach(({ label, slot, visual }) => {
      visual.container.position.set(startX + spacing * slot, centerY)
      visual.setSize(spriteSize)
      if (label) label.position.set(0, -spriteSize * 0.52)
    })
  }

  function showFeedback(feedback) {
    if (!feedback) return
    if (feedback.noteIndex !== undefined) {
      charactersBySlot
        .get(PLAYER_SLOT)
        .visual.playState(
          'leftArm',
          'up',
          getPerformance()?.poseDuration ?? 0.12,
        )
    }
    if (feedback.rating !== 'perfect') {
      characters
        .filter(({ slot }) => slot < PLAYER_SLOT)
        .forEach(({ visual }) => {
          visual.playState('face', 'mad', MAD_DURATION)
        })
    } else if (feedback.noteIndex === undefined) {
      characters.forEach(({ visual }) => {
        visual.playState('face', 'happy', HAPPY_DURATION)
      })
    }
  }

  function update(ticker) {
    characterLayer.visible = getShowCharacters()
    if (!characterLayer.visible) return

    const deltaSeconds = ticker.deltaMS / 1000
    characters.forEach(({ visual }) => visual.update(deltaSeconds))

    const currentCpuPoses = new Set()
    const performance = getPerformance()
    if (getIsPlaying() && performance) {
      const playbackTime = audioEngine.getPlaybackTime()
      if (playbackTime !== null) {
        performance.cpuTurns.forEach((turn) => {
          performance.notes.forEach((note, noteIndex) => {
            const poseStart = turn.startTime + note.time
            const poseEnd = poseStart + performance.poseDuration
            if (playbackTime < poseStart || playbackTime >= poseEnd) return

            const poseKey = `${turn.character}:${turn.startTime}:${noteIndex}`
            currentCpuPoses.add(poseKey)
            if (!activeCpuPoses.has(poseKey)) {
              charactersBySlot
                .get(turn.character)
                ?.visual.playState(
                  'leftArm',
                  'up',
                  poseEnd - playbackTime,
                )
            }
          })
        })
      }
    }
    activeCpuPoses = currentCpuPoses
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
