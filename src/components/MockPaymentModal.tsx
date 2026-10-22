import type { Booking } from '../types'
import { formatMoney } from '../lib/format'

export default function MockPaymentModal({ booking, busy, onClose, onConfirm }: { booking: Booking; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section className="auth-modal payment-modal" role="dialog" aria-modal="true" aria-labelledby="mock-payment-title">
        <button className="modal-close" aria-label="Tutup" onClick={onClose} disabled={busy}>×</button>
        <span className="eyebrow">DEMO · MOCK PAYMENT</span><h2 id="mock-payment-title">Selesaikan booking</h2>
        <p>Ini simulasi untuk portfolio. Tidak ada uang yang ditagih atau dikirim ke penyedia pembayaran.</p>
        <div className="mock-payment-summary"><strong>{booking.trip?.title ?? 'Trip'}</strong><span>{booking.quantity} peserta</span><b>{formatMoney(booking.total_amount, booking.currency)}</b></div>
        <button className="primary-button" disabled={busy} onClick={onConfirm}>{busy ? 'Memproses simulasi…' : 'Konfirmasi pembayaran simulasi'}</button>
        <button className="text-button" disabled={busy} onClick={onClose}>Kembali</button>
      </section>
    </div>
  )
}
