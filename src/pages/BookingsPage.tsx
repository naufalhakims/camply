import type { Booking, TripGameRoom } from '../types'
import { formatDate, formatMoney } from '../lib/format'
import { useLanguage } from '../lib/i18n'

type Props = {
  bookings: Booking[]
  rooms: TripGameRoom[]
  onOpenGame: (roomId: string) => void
  onPay: (booking: Booking) => void
  onCancel: (bookingId: string) => void
  onExplore: () => void
}

export default function BookingsPage({ bookings, rooms, onOpenGame, onPay, onCancel, onExplore }: Props) {
  const { language, t } = useLanguage()
  const locale = language === 'en' ? 'en-US' : 'id-ID'
  return <main className="content profile-page bookings-page">
    <span className="eyebrow">{t('PERJALANAN ANDA')}</span><h1>{t('Booking saya')}</h1>
    {bookings.length ? <div className="booking-list">{bookings.map(booking => {
      const expired = booking.status === 'pending_payment' && new Date(booking.expires_at) <= new Date()
      const status = expired ? 'expired' : booking.status
      const gameRoom = booking.status === 'confirmed'
        ? rooms.find(room => room.trip_id === booking.trip_id)
        : undefined
      return <article className="panel booking-row" key={booking.id}>
        <div><span className="eyebrow">{booking.trip?.destination ?? 'Trip'}</span><h2>{booking.trip?.title ?? 'Trip'}</h2><p>{booking.trip ? `${formatDate(booking.trip.starts_at, locale)} – ${formatDate(booking.trip.ends_at, locale)}` : t('Trip detail tidak tersedia')} · {booking.quantity} {t('peserta')}</p></div>
        <div className="booking-row-side"><strong>{formatMoney(booking.total_amount, booking.currency, locale)}</strong><span className={`status-pill status-${status}`}>{t(status.replace('_', ' '))}</span>
          {booking.payment?.provider === 'mock' && <small className="mock-payment-note">{t('PEMBAYARAN SIMULASI · MOCK')}</small>}
          {gameRoom && <button className="outline-button" onClick={() => onOpenGame(gameRoom.id)}>{t(gameRoom.status === 'open' ? 'Buka ruang' : 'Lihat cerita')}</button>}
          {status === 'pending_payment' && <>{new Date(booking.expires_at) > new Date() && <small>{t('Bayar sebelum')} {new Date(booking.expires_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</small>}<button className="primary-button mock-pay-button" onClick={() => onPay(booking)}>{t('Bayar simulasi')}</button><button className="text-button" onClick={() => onCancel(booking.id)}>{t('Batalkan reservasi')}</button></>}
        </div>
      </article>
    })}</div> : <div className="empty-state"><strong>{t('Belum ada booking.')}</strong><p>{t('Temukan perjalanan yang menarik untukmu.')}</p><button className="primary-button" onClick={onExplore}>{t('Jelajahi trip')}</button></div>}
  </main>
}
