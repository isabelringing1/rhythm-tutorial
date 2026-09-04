export function StartMenu({ onCalibrate, onStart }) {
  return (
    <div className="start-menu">
      <button type="button" onClick={onCalibrate}>
        Calibrate
      </button>
      <button type="button" onClick={onStart}>
        Start
      </button>
    </div>
  )
}
