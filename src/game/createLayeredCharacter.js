import { Container, Sprite } from 'pixi.js'
import { createCharacterStateMachine } from './characterStateMachine.js'
import { getStatePathSources, resolveStatePath } from './flags.js'

export function getCharacterTextureSources(config) {
  return [
    ...new Set(
      config.layers.flatMap((layer) =>
        layer.type === 'fixed'
          ? [layer.src]
          : Object.values(layer.states).flatMap(getStatePathSources),
      ),
    ),
  ]
}

export function createLayeredCharacter(config, textures, initialFlags = {}) {
  const container = new Container()
  const stateMachine = createCharacterStateMachine(config)
  const statefulLayers = new Map()
  const sprites = []
  let flags = initialFlags

  function getTexture(src) {
    const texture = textures.get(src)
    if (!texture) {
      throw new Error(`character texture was not loaded: ${src}`)
    }
    return texture
  }

  config.layers.forEach((layer) => {
    const src =
      layer.type === 'fixed'
        ? layer.src
        : resolveStatePath(layer.states[layer.defaultState], flags)
    const sprite = new Sprite(getTexture(src))
    sprite.anchor.set(0.5)
    container.addChild(sprite)
    sprites.push(sprite)

    if (layer.type === 'stateful') {
      statefulLayers.set(layer.id, {
        config: layer,
        displayedState: layer.defaultState,
        displayedSrc: src,
        sprite,
      })
    }
  })

  function syncStatefulLayers() {
    statefulLayers.forEach((layer, category) => {
      const state = stateMachine.getState(category)
      const src = resolveStatePath(layer.config.states[state], flags)
      if (state === layer.displayedState && src === layer.displayedSrc) return

      layer.sprite.texture = getTexture(src)
      layer.displayedState = state
      layer.displayedSrc = src
    })
  }

  return {
    container,

    getState(category) {
      return stateMachine.getState(category)
    },

    setState(category, state) {
      stateMachine.setState(category, state)
      syncStatefulLayers()
    },

    playState(category, state, duration) {
      stateMachine.playState(category, state, duration)
      syncStatefulLayers()
    },

    resetState(category) {
      stateMachine.resetState(category)
      syncStatefulLayers()
    },

    setFlags(nextFlags) {
      flags = nextFlags
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
