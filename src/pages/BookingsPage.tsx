import type { Booking, TripGameRoom } from '../types'
import { formatDate, formatMoney } from '../lib/format'

type Props = {
  bookings: Booking[]
  rooms: TripGameRoom[]
  onOpenGame: (roomId: string) => void
  onPay: (booking: Booking) => void
  onCancel: (bookingId: string) => void
  onExplore: () => void
}

export default function BookingsPage({ bookings, rooms, onOpenGame, onPay, onCancel, onExplore }: Props) {
  return <main className="content profile-page bookings-page">
    <span className="eyebrow">PERJALANAN ANDA</span><h1>Booking saya</h1>
    {rooms.length > 0 && <section className="managed-trips traveler-game-rooms"><h2>Ruang cerita trip</h2><div className="game-room-list">{rooms.map(room => <article className="panel game-room-row" key={room.id}><div><span className={`status-pill ${room.status === 'open' ? 'status-published' : 'status-expired'}`}>{room.status === 'open' ? 'terbuka' : 'selesai'}</span><h3>{room.trip?.title ?? 'Trip'}</h3><p>{room.prompt}</p></div><button className="outline-button" onClick={() => onOpenGame(room.id)}>{room.status === 'open' ? 'Buka ruang' : 'Lihat cerita'}</button></article>)}</div></section>}
    {bookings.length ? <div className="booking-list">{bookings.map(booking => {
      const expired = booking.status === 'pending_payment' && new Date(booking.expires_at) <= new Date()
      const status = expired ? 'expired' : booking.status
      return <article className="panel booking-row" key={booking.id}>
        <div><span className="eyebrow">{booking.trip?.destination ?? 'Trip'}</span><h2>{booking.trip?.title ?? 'Trip'}</h2><p>{booking.trip ? `${formatDate(booking.trip.starts_at)} – ${formatDate(booking.trip.ends_at)}` : 'Trip detail tidak tersedia'} · {booking.quantity} peserta</p></div>
        <div className="booking-row-side"><strong>{formatMoney(booking.total_amount, booking.currency)}</strong><span className={`status-pill status-${status}`}>{status.replace('_', ' ')}</span>
          {booking.payment?.provider === 'mock' && <small className="mock-payment-note">PEMBAYARAN SIMULASI · MOCK</small>}
          {status === 'pending_payment' && <>{new Date(booking.expires_at) > new Date() && <small>Bayar sebelum {new Date(booking.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</small>}<button className="primary-button mock-pay-button" onClick={() => onPay(booking)}>Bayar simulasi</button><button className="text-button" onClick={() => onCancel(booking.id)}>Batalkan reservasi</button></>}
        </div>
      </article>
    })}</div> : <div className="empty-state"><strong>Belum ada booking.</strong><p>Temukan perjalanan yang menarik untukmu.</p><button className="primary-button" onClick={onExplore}>Jelajahi trip</button></div>}
  </main>
}
