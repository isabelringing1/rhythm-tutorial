import { getStatePathSources } from './flags.js'

function validateConfig(config) {
  if (!config || !Array.isArray(config.layers)) {
    throw new Error('character visual config must contain a layers array')
  }

  const layerIds = new Set()
  config.layers.forEach((layer) => {
    if (!layer?.id || layerIds.has(layer.id)) {
      throw new Error(`character visual layer id must be unique: ${layer?.id}`)
    }
    layerIds.add(layer.id)

    if (layer.type === 'fixed') {
      if (!layer.src) {
        throw new Error(`fixed layer "${layer.id}" must define src`)
      }
      return
    }

    if (layer.type !== 'stateful') {
      throw new Error(`layer "${layer.id}" has unknown type "${layer.type}"`)
    }
    if (
      !layer.states ||
      typeof layer.states !== 'object' ||
      !layer.defaultState ||
      !layer.states[layer.defaultState]
    ) {
      throw new Error(
        `stateful layer "${layer.id}" must define states and a valid defaultState`,
      )
    }
    Object.values(layer.states).forEach(getStatePathSources)
  })
}

export function createCharacterStateMachine(config) {
  validateConfig(config)

  const categories = new Map(
    config.layers
      .filter((layer) => layer.type === 'stateful')
      .map((layer) => [
        layer.id,
        {
          currentState: layer.defaultState,
          defaultState: layer.defaultState,
          remaining: 0,
          states: layer.states,
        },
      ]),
  )

  function getCategory(category) {
    const entry = categories.get(category)
    if (!entry) {
      throw new Error(`unknown character state category "${category}"`)
    }
    return entry
  }

  return {
    setState(category, state) {
      const entry = getCategory(category)
      if (!entry.states[state]) {
        throw new Error(`unknown state "${state}" for category "${category}"`)
      }

      entry.currentState = state
      entry.remaining = 0
    },

    playState(category, state, duration) {
      const entry = getCategory(category)
      if (!entry.states[state]) {
        throw new Error(`unknown state "${state}" for category "${category}"`)
      }
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('character state duration must be a positive number')
      }

      entry.currentState = state
      entry.remaining = duration
    },

    getState(category) {
      return getCategory(category).currentState
    },

    resetState(category) {
      const entry = getCategory(category)
      entry.currentState = entry.defaultState
      entry.remaining = 0
    },

    update(deltaSeconds) {
      if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
        throw new Error('character state delta must be a non-negative number')
      }

      categories.forEach((entry) => {
        if (entry.remaining <= 0) return

        entry.remaining -= deltaSeconds
        if (entry.remaining <= 0) {
          entry.currentState = entry.defaultState
          entry.remaining = 0
        }
      })
    },
  }
}
