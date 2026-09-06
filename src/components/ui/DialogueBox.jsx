import { useEffect, useRef, useState } from 'react'

const PROMPT_DELAY_MS = 600

export function DialogueBox({ text, onAdvance, isPersistent = false }) {
  const [promptState, setPromptState] = useState({
    text,
    isVisible: false,
  })
  const timeoutRef = useRef(null)
  const showPrompt =
    !isPersistent && promptState.text === text && promptState.isVisible

  useEffect(() => {
    if (isPersistent) return undefined

    timeoutRef.current = window.setTimeout(() => {
      setPromptState({ text, isVisible: true })
      timeoutRef.current = null
    }, PROMPT_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [isPersistent, text])

  function handleClick() {
    if (!showPrompt) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      setPromptState({ text, isVisible: true })
      return
    }

    onAdvance()
  }

  if (isPersistent) {
    return (
      <div className="dialogue-box">
        <span>{text}</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="dialogue-box"
      onClick={handleClick}
      aria-label={`${text} ${showPrompt ? 'Click to continue' : 'Click to show continue arrow'}`}
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
