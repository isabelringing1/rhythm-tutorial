export function DebugMenu({
  currentStep,
  onGoToStep,
  onSkip,
  totalSteps,
}) {
  function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    onGoToStep(Number(formData.get('step')))
  }

  return (
    <div className="debug-menu">
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
  )
}
