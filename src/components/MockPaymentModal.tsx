import type { Booking } from '../types'
import { formatMoney } from '../lib/format'
import { useLanguage } from '../lib/i18n'

export default function MockPaymentModal({ booking, busy, onClose, onConfirm }: { booking: Booking; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  const { language, t } = useLanguage()
  const locale = language === 'en' ? 'en-US' : 'id-ID'
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section className="auth-modal payment-modal" role="dialog" aria-modal="true" aria-labelledby="mock-payment-title">
        <button className="modal-close" aria-label={t('Tutup')} onClick={onClose} disabled={busy}>×</button>
        <span className="eyebrow">{t('DEMO · MOCK PAYMENT')}</span><h2 id="mock-payment-title">{t('Selesaikan booking')}</h2>
        <p>{t('Ini simulasi untuk portfolio. Tidak ada uang yang ditagih atau dikirim ke penyedia pembayaran.')}</p>
        <div className="mock-payment-summary"><strong>{booking.trip?.title ?? 'Trip'}</strong><span>{booking.quantity} {t('peserta')}</span><b>{formatMoney(booking.total_amount, booking.currency, locale)}</b></div>
        <button className="primary-button" disabled={busy} onClick={onConfirm}>{busy ? t('Memproses simulasi…') : t('Konfirmasi pembayaran simulasi')}</button>
        <button className="text-button" disabled={busy} onClick={onClose}>{t('Kembali')}</button>
      </section>
    </div>
  )
}
