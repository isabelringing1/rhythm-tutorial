export function DebugMenu({ onSkip }) {
  return (
    <div className="debug-menu">
      <strong>Debug</strong>
      <button type="button" onClick={onSkip}>
        Skip step
      </button>
    </div>
  )
}
