export function StartMenu({ onCalibrate, onStart, showStart }) {
  return (
    <div className="start-menu">
      <button
        type="button"
        className="calibrate-button"
        onClick={onCalibrate}
      >
        Calibrate
      </button>
      {showStart && (
        <button type="button" className="start-button" onClick={onStart}>
          Start
        </button>
      )}
    </div>
  )
}
