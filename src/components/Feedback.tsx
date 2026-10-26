import { useLanguage } from '../lib/i18n'

export default function Feedback({ error, notice, onDismiss }: { error: string; notice: string; onDismiss: () => void }) {
  const { t } = useLanguage()
  if (!error && !notice) return null
  return <div className={`feedback ${error ? 'feedback-error' : ''}`} role={error ? 'alert' : 'status'}>{t(error || notice)}<button onClick={onDismiss} aria-label={t('Tutup notifikasi')}>×</button></div>
}
