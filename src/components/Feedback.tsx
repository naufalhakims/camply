export default function Feedback({ error, notice, onDismiss }: { error: string; notice: string; onDismiss: () => void }) {
  if (!error && !notice) return null
  return <div className={`feedback ${error ? 'feedback-error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}<button onClick={onDismiss} aria-label="Tutup notifikasi">×</button></div>
}
