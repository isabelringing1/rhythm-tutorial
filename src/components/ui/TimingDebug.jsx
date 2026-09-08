const TO_MILLISECONDS = 1000

export function TimingDebug({
  canPause,
  isPaused,
  playerDelay,
  timing,
  onChange,
  onTogglePause,
}) {
  function updateTiming(field, milliseconds) {
    const seconds = Math.max(0, Number(milliseconds)) / TO_MILLISECONDS
    onChange({ ...timing, [field]: seconds })
  }

  return (
    <fieldset className="timing-debug">
      <legend>Timing debug</legend>

      <label>
        Initial delay (ms)
        <input
          type="number"
          min="0"
          step="10"
          value={timing.beatOffset * TO_MILLISECONDS}
          onChange={(event) => updateTiming('beatOffset', event.target.value)}
        />
      </label>

      <output>Player delay: {playerDelay.toFixed(1)} ms</output>

      <button type="button" disabled={!canPause} onClick={onTogglePause}>
        {isPaused ? 'Resume' : 'Pause'}
      </button>
    </fieldset>
  )
}
