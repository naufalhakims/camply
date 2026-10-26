import { Link } from 'react-router-dom'
import type { Booking } from '../types'
import { formatMoney } from '../lib/format'
import { useLanguage } from '../lib/i18n'

export default function OrganizerBookingsPage({ bookings }: { bookings: Booking[] }) {
  const { language, t } = useLanguage()
  const locale = language === 'en' ? 'en-US' : 'id-ID'
  return <main className="content profile-page organizer-page">
    <Link className="text-button back-link" to="/organizer">← {t('Kembali ke kelola trip')}</Link>
    <span className="eyebrow">{t('OPERASIONAL ORGANIZER')}</span><h1>{t('Booking peserta')}</h1>
    {bookings.length ? <div className="booking-list">{bookings.map(booking => <article className="panel participant-row" key={booking.id}>
      <div><span className="eyebrow">{booking.trip?.title ?? 'Trip'}</span><p>{booking.traveler?.display_name ?? `Traveler ${booking.traveler_id.slice(0, 8)}…`} · {booking.quantity} {t('peserta')}</p></div>
      <div className="booking-row-side"><span className={`status-pill status-${booking.status}`}>{t(booking.status.replace('_', ' '))}</span><strong>{formatMoney(booking.total_amount, booking.currency, locale)}</strong><small>{booking.payment ? `${t('Pembayaran')} ${t(booking.payment.status)} (${booking.payment.provider})` : t('Belum dibayar')}</small></div>
    </article>)}</div> : <div className="empty-state">{t('Belum ada booking untuk trip Anda.')}</div>}
  </main>
}
