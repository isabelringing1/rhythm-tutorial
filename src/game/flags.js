const FLAG_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/
const INLINE_FLAG_PATTERN =
  /^\[\{([A-Za-z_][A-Za-z0-9_-]*)\}=(true|false)\]$/
const INLINE_ACTION_PATTERN =
  /^\[\{action\}\{([A-Za-z_][A-Za-z0-9_-]*)\}\]$/

export function isValidFlagId(id) {
  return typeof id === 'string' && FLAG_ID_PATTERN.test(id)
}

export function parseInlineFlagDirective(line) {
  if (typeof line !== 'string') return null

  const match = line.match(INLINE_FLAG_PATTERN)
  if (!match) return null

  return Object.freeze({
    id: match[1],
    value: match[2] === 'true',
  })
}

export function parseInlineActionDirective(line) {
  if (typeof line !== 'string') return null

  const match = line.match(INLINE_ACTION_PATTERN)
  return match ? match[1] : null
}

function parseConditionKey(key) {
  if (key === '') return []

  const ids = key.split(',').map((id) => id.trim())
  if (
    ids.some((id) => !isValidFlagId(id)) ||
    new Set(ids).size !== ids.length
  ) {
    throw new Error(`invalid conditional state flag key "${key}"`)
  }
  return ids
}

function getConditionalEntries(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('character state path must be a path or conditional object')
  }

  const entries = Object.entries(value).map(([key, src]) => {
    if (typeof src !== 'string' || src === '') {
      throw new Error('conditional character state paths must be non-empty')
    }
    return { flags: parseConditionKey(key), src }
  })
  if (!entries.some((entry) => entry.flags.length === 0)) {
    throw new Error('conditional character state path must define an empty fallback')
  }
  return entries
}

export function getStatePathSources(value) {
  if (typeof value === 'string' && value !== '') return [value]
  return getConditionalEntries(value).map((entry) => entry.src)
}

export function resolveStatePath(value, flags = {}) {
  if (typeof value === 'string' && value !== '') return value

  const entries = getConditionalEntries(value)
  let bestMatch = entries.find((entry) => entry.flags.length === 0)
  entries.forEach((entry) => {
    if (
      entry.flags.length > bestMatch.flags.length &&
      entry.flags.every((id) => flags[id] === true)
    ) {
      bestMatch = entry
    }
  })
  return bestMatch.src
}
