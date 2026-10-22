import type { Trip } from '../types'
import { formatDate, formatMoney } from '../lib/format'

type Props = {
  trip: Trip
  canBook: boolean
  bookingAccessLoading: boolean
  remainingSeats: number | null
  quantity: number
  busy: boolean
  onQuantityChange: (quantity: number) => void
  onReserve: () => void
  onBack: () => void
}

export default function TripDetailsPage({ trip, canBook, bookingAccessLoading, remainingSeats, quantity, busy, onQuantityChange, onReserve, onBack }: Props) {
  const duration = Math.max(1, Math.ceil((new Date(trip.ends_at).getTime() - new Date(trip.starts_at).getTime()) / 86400000))
  return <main className="content detail-page">
    <button className="text-button back-link" onClick={onBack}>← Kembali ke semua trip</button>
    <section className="detail-hero" style={trip.cover_image_url ? { backgroundImage: `linear-gradient(90deg, rgba(19,35,25,.75), rgba(19,35,25,.12)), url(${trip.cover_image_url})` } : undefined}>
      <span className="eyebrow">TRIP PILIHAN CAMPly</span><h1>{trip.title}</h1><p>{trip.destination} · {formatDate(trip.starts_at)} – {formatDate(trip.ends_at)}</p>
    </section>
    <div className="detail-grid">
      <article className="panel"><span className="eyebrow">TENTANG PERJALANAN</span><h2>Petualangan dimulai di sini.</h2><p className="description">{trip.description || 'Informasi perjalanan akan segera ditambahkan oleh organizer.'}</p></article>
      <aside className="panel booking-panel">
        <span className="eyebrow">HARGA PER ORANG</span><strong className="price">{formatMoney(trip.price, trip.currency)}</strong>
        {bookingAccessLoading ? <p>Memeriksa akses booking…</p> : canBook ? <>
        <p>Durasi {duration} hari · {remainingSeats === null ? 'Memeriksa kursi…' : `${remainingSeats} kursi tersisa`}</p>
        <label className="quantity-label">JUMLAH PESERTA<input type="number" min="1" max={remainingSeats ?? trip.capacity} value={quantity} onChange={event => onQuantityChange(Math.max(1, Math.min(remainingSeats ?? trip.capacity, Number(event.target.value) || 1)))} /></label>
        <p className="booking-total">Total <strong>{formatMoney(trip.price * quantity, trip.currency)}</strong></p>
        <button className="primary-button" disabled={busy || remainingSeats === 0} onClick={onReserve}>{busy ? 'Menahan kursi…' : remainingSeats === 0 ? 'Trip penuh' : 'Tahan kursi 15 menit'}</button>
        <small className="hold-note">Kursi ditahan 15 menit. Pembayaran tersedia sebagai simulasi mock.</small>
        </> : <p>Booking dan pembayaran trip hanya tersedia untuk akun traveler.</p>}
      </aside>
    </div>
  </main>
}
