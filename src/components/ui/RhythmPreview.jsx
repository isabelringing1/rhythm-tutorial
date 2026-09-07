export function RhythmPreview({ patterns }) {
  return (
    <details className="rhythm-preview">
      <summary>Rhythm preview</summary>
      {patterns.map(({ chart, instrument }) => (
        <div key={instrument.id}>
          <strong>{instrument.id}</strong>
          <div className="rhythm-bars">
            {chart.bars.map((bar, barIndex) => (
              <div className="rhythm-bar" key={`bar-${barIndex}`}>
                {bar.flatMap((beat, beatIndex) =>
                  [...beat].map((symbol, stepIndex) => (
                    <span
                      className={`rhythm-step ${symbol === '.' ? '' : 'hit'}`}
                      key={`${beatIndex}-${stepIndex}`}
                      title={`Bar ${barIndex + 1}, beat ${beatIndex + 1}, step ${stepIndex + 1}`}
                    />
                  )),
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </details>
  )
}
