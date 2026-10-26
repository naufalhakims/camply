import type { Booking, Trip } from '../types'
import { formatMoney, formatDate } from '../lib/format'
import { useLanguage } from '../lib/i18n'

export default function AdminDashboardPage({ trips, bookings, onCancelTrip }: { trips: Trip[]; bookings: Booking[]; onCancelTrip: (id: string) => void }) {
  const { language, t } = useLanguage()
  const locale = language === 'en' ? 'en-US' : 'id-ID'
  return <main className="content profile-page admin-page">
    <span className="eyebrow">{t('ADMINISTRASI CAMPLY')}</span><h1>{t('Ringkasan operasional')}</h1>
    <div className="admin-metrics"><article className="panel"><span className="eyebrow">{t('TRIP')}</span><strong>{trips.length}</strong></article><article className="panel"><span className="eyebrow">{t('BOOKING')}</span><strong>{bookings.length}</strong></article><article className="panel"><span className="eyebrow">{t('PEMBAYARAN TERCATAT')}</span><strong>{bookings.filter(booking => booking.payment).length}</strong></article></div>
    <section className="managed-trips admin-records"><h2>{t('Trip')}</h2>{trips.length ? trips.map(trip => <article className="panel managed-trip-row" key={trip.id}><div><span className={`status-pill status-${trip.status}`}>{t(trip.status)}</span><h3>{trip.title}</h3><p>{trip.destination} · {formatDate(trip.starts_at, locale)} – {formatDate(trip.ends_at, locale)} · {t('organizer')} {trip.organizer_id.slice(0, 8)}…</p><strong>{formatMoney(trip.price, trip.currency, locale)} · {t('kapasitas')} {trip.capacity}</strong></div>{trip.status !== 'cancelled' && <button className="text-button" onClick={() => onCancelTrip(trip.id)}>{t('Batalkan trip')}</button>}</article>) : <div className="empty-state">{t('Belum ada trip.')}</div>}</section>
    <section className="managed-trips admin-records"><h2>{t('Booking dan pembayaran')}</h2>{bookings.length ? bookings.map(booking => <article className="panel participant-row" key={booking.id}><div><span className="eyebrow">{booking.trip?.title ?? 'Trip'}</span><p>{booking.traveler?.display_name ?? `Traveler ${booking.traveler_id.slice(0, 8)}…`} · {booking.quantity} {t('peserta')}</p></div><div className="booking-row-side"><span className={`status-pill status-${booking.status}`}>{t(booking.status.replace('_', ' '))}</span><strong>{formatMoney(booking.total_amount, booking.currency, locale)}</strong><small>{booking.payment ? `${t('Pembayaran')} ${t(booking.payment.status)} (${booking.payment.provider})` : t('Belum dibayar')}</small></div></article>) : <div className="empty-state">{t('Belum ada booking.')}</div>}</section>
  </main>
}
