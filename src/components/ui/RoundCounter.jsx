export function RoundCounter({ remaining, result }) {
  let message = `${remaining} more ${remaining === 1 ? 'time' : 'times'}!`
  if (result === 'perfect') message = 'Perfect!'
  if (result === 'miss') message = 'Try again!'

  return <p className={`round-counter ${result ?? ''}`}>{message}</p>
}
