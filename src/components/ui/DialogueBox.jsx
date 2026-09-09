import { useCallback, useEffect, useRef, useState } from 'react'

const PROMPT_DELAY_MS = 600

export function DialogueBox({
  text,
  onAdvance,
  autoAdvanceDelayMs = null,
  isPersistent = false,
}) {
  const [promptState, setPromptState] = useState({
    text,
    isVisible: false,
  })
  const buttonRef = useRef(null)
  const timeoutRef = useRef(null)
  const showPrompt =
    !isPersistent &&
    autoAdvanceDelayMs === null &&
    promptState.text === text &&
    promptState.isVisible

  useEffect(() => {
    if (isPersistent) return undefined

    timeoutRef.current = window.setTimeout(() => {
      if (autoAdvanceDelayMs === null) {
        setPromptState({ text, isVisible: true })
      } else {
        onAdvance()
      }
      timeoutRef.current = null
    }, autoAdvanceDelayMs ?? PROMPT_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [autoAdvanceDelayMs, isPersistent, onAdvance, text])

  const handleClick = useCallback(() => {
    onAdvance()
  }, [onAdvance])

  useEffect(() => {
    if (isPersistent || autoAdvanceDelayMs !== null) return undefined

    function handleKeyDown(event) {
      if (
        event.repeat ||
        (event.key !== 'Enter' && event.code !== 'KeyJ')
      ) {
        return
      }
      if (
        event.target instanceof HTMLElement &&
        event.target.matches('button, input, select, textarea') &&
        event.target !== buttonRef.current
      ) {
        return
      }

      event.preventDefault()
      handleClick()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [autoAdvanceDelayMs, handleClick, isPersistent])

  if (isPersistent || autoAdvanceDelayMs !== null) {
    return (
      <div className="dialogue-box">
        <span>{text}</span>
      </div>
    )
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className="dialogue-box"
      onClick={handleClick}
      aria-label={`${text} Click to continue`}
    >
      <span>{text}</span>
      {showPrompt && (
        <svg
          className="dialogue-prompt"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M5 3.5 L16 10 L5 16.5 Z" />
        </svg>
      )}
    </button>
  )
}
