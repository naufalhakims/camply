import { Link } from 'react-router-dom'
import type { Booking } from '../types'
import { formatMoney } from '../lib/format'

export default function OrganizerBookingsPage({ bookings }: { bookings: Booking[] }) {
  return <main className="content profile-page organizer-page">
    <Link className="text-button back-link" to="/organizer">← Kembali ke kelola trip</Link>
    <span className="eyebrow">OPERASIONAL ORGANIZER</span><h1>Booking peserta</h1>
    {bookings.length ? <div className="booking-list">{bookings.map(booking => <article className="panel participant-row" key={booking.id}>
      <div><span className="eyebrow">{booking.trip?.title ?? 'Trip'}</span><p>{booking.traveler?.display_name ?? `Traveler ${booking.traveler_id.slice(0, 8)}…`} · {booking.quantity} peserta</p></div>
      <div className="booking-row-side"><span className={`status-pill status-${booking.status}`}>{booking.status.replace('_', ' ')}</span><strong>{formatMoney(booking.total_amount, booking.currency)}</strong><small>{booking.payment ? `Pembayaran ${booking.payment.status} (${booking.payment.provider})` : 'Belum dibayar'}</small></div>
    </article>)}</div> : <div className="empty-state">Belum ada booking untuk trip Anda.</div>}
  </main>
}
