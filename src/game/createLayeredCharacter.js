import { Container, Sprite } from 'pixi.js'
import { createCharacterStateMachine } from './characterStateMachine.js'

export function getCharacterTextureSources(config) {
  return [
    ...new Set(
      config.layers.flatMap((layer) =>
        layer.type === 'fixed' ? [layer.src] : Object.values(layer.states),
      ),
    ),
  ]
}

export function createLayeredCharacter(config, textures) {
  const container = new Container()
  const stateMachine = createCharacterStateMachine(config)
  const statefulLayers = new Map()
  const sprites = []

  function getTexture(src) {
    const texture = textures.get(src)
    if (!texture) {
      throw new Error(`character texture was not loaded: ${src}`)
    }
    return texture
  }

  config.layers.forEach((layer) => {
    const src =
      layer.type === 'fixed' ? layer.src : layer.states[layer.defaultState]
    const sprite = new Sprite(getTexture(src))
    sprite.anchor.set(0.5)
    container.addChild(sprite)
    sprites.push(sprite)

    if (layer.type === 'stateful') {
      statefulLayers.set(layer.id, {
        config: layer,
        displayedState: layer.defaultState,
        sprite,
      })
    }
  })

  function syncStatefulLayers() {
    statefulLayers.forEach((layer, category) => {
      const state = stateMachine.getState(category)
      if (state === layer.displayedState) return

      layer.sprite.texture = getTexture(layer.config.states[state])
      layer.displayedState = state
    })
  }

  return {
    container,

    playState(category, state, duration) {
      stateMachine.playState(category, state, duration)
      syncStatefulLayers()
    },

    setSize(size) {
      sprites.forEach((sprite) => {
        sprite.width = size
        sprite.height = size
      })
    },

    update(deltaSeconds) {
      stateMachine.update(deltaSeconds)
      syncStatefulLayers()
    },

    destroy() {
      container.destroy({ children: true })
    },
  }
}
