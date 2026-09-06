export function RhythmPreview({ chart }) {
  return (
    <details className="rhythm-preview">
      <summary>Rhythm preview</summary>
      <div className="rhythm-bars">
        {chart.bars.map((bar, barIndex) => (
          <div className="rhythm-bar" key={`bar-${barIndex}`}>
            {bar.flatMap((beat, beatIndex) =>
              [...beat].map((symbol, stepIndex) => (
                <span
                  className={`rhythm-step ${symbol === 'x' ? 'hit' : ''}`}
                  key={`${beatIndex}-${stepIndex}`}
                  title={`Bar ${barIndex + 1}, beat ${beatIndex + 1}, step ${stepIndex + 1}`}
                />
              )),
            )}
          </div>
        ))}
      </div>
    </details>
  )
}
