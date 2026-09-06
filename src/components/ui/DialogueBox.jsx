export function DialogueBox({ text, onAdvance }) {
  return (
    <button
      type="button"
      className="dialogue-box"
      onClick={onAdvance}
      aria-label={`${text} Click to continue`}
    >
      <span>{text}</span>
      <svg
        className="dialogue-prompt"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path d="M5 3.5 L16 10 L5 16.5 Z" />
      </svg>
    </button>
  )
}
