export function DebugMenu({
  currentStep,
  microphone,
  onGoToStep,
  onSkip,
  totalSteps,
}) {
  function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    onGoToStep(Number(formData.get('step')))
  }

  const levelPercent = Math.min(100, microphone.rms * 1_000)
  const pitchText =
    microphone.pitch === null ? '—' : `${microphone.pitch.toFixed(0)} Hz`

  return (
    <div className="debug-menu">
      <div className="debug-menu-controls">
        <strong>Debug</strong>
        <form onSubmit={handleSubmit}>
          <label htmlFor="debug-step">Step</label>
          <input
            id="debug-step"
            key={currentStep}
            type="number"
            name="step"
            min="1"
            max={totalSteps}
            defaultValue={currentStep}
          />
          <button type="submit">Go</button>
        </form>
        <button type="button" onClick={onSkip}>
          Skip step
        </button>
      </div>
      {microphone.active && (
        <div className="microphone-debug">
          <div
            aria-label="Microphone audio level"
            aria-valuemax="100"
            aria-valuemin="0"
            aria-valuenow={levelPercent}
            className="microphone-level"
            role="meter"
          >
            <div
              className="microphone-level-fill"
              style={{ height: `${levelPercent}%` }}
            />
          </div>
          <div>
            <strong>Mic</strong>
            <output>Level: {microphone.rms.toFixed(4)} RMS</output>
            <output>Pitch: {pitchText}</output>
          </div>
        </div>
      )}
    </div>
  )
}
