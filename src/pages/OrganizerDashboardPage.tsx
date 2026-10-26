import type { FormEvent } from 'react'
import type { Booking, Trip, TripGameRoom } from '../types'
import { formatDate, formatMoney, toDateTimeLocal } from '../lib/format'
import { Link } from 'react-router-dom'
import { travelCategories } from '../data/travelCategories'
import { useLanguage } from '../lib/i18n'

type Props = {
  now: number
  trips: Trip[]
  bookings: Booking[]
  rooms: TripGameRoom[]
  editingTrip: Trip | null
  loadingTrips: boolean
  savingTrip: boolean
  newGameTripId: string
  newGamePrompt: string
  creatingGameRoom: boolean
  onEditingTrip: (trip: Trip | null) => void
  onSaveTrip: (event: FormEvent<HTMLFormElement>) => void
  onPublishTrip: (tripId: string) => void
  onGameTripChange: (tripId: string) => void
  onPromptChange: (prompt: string) => void
  onCreateRoom: (event: FormEvent<HTMLFormElement>) => void
  onOpenRoom: (roomId: string) => void
}

export default function OrganizerDashboardPage(props: Props) {
  const { language, t } = useLanguage()
  const locale = language === 'en' ? 'en-US' : 'id-ID'
  const { now, trips, bookings, rooms, editingTrip, loadingTrips, savingTrip, newGameTripId, newGamePrompt, creatingGameRoom, onEditingTrip, onSaveTrip, onPublishTrip, onGameTripChange, onPromptChange, onCreateRoom, onOpenRoom } = props
  const eligibleTrips = trips.filter(trip => trip.status === 'published' && new Date(trip.starts_at).getTime() > now && !rooms.some(room => room.trip_id === trip.id))
  const archivedTrips = trips.filter(trip => trip.status === 'published' && new Date(trip.starts_at).getTime() <= now)
  const currentTrips = trips.filter(trip => !archivedTrips.includes(trip))
  const renderTrip = (trip: Trip, archived = false) => <article className="panel managed-trip-row" key={trip.id}>
    <div>
      <span className={`status-pill ${archived ? 'status-expired' : `status-${trip.status}`}`}>{t(archived ? 'arsip' : trip.status)}</span>
      <h3>{trip.title}</h3>
      <p>{trip.destination} · {formatDate(trip.starts_at, locale)} – {formatDate(trip.ends_at, locale)}</p>
      <strong>{formatMoney(trip.price, trip.currency, locale)} · {t('kapasitas')} {trip.capacity}</strong>
    </div>
    {!archived && <div className="managed-trip-actions">
      <button className="outline-button" onClick={() => onEditingTrip(trip)}>Edit</button>
      {trip.status === 'draft' && <button className="primary-button" onClick={() => onPublishTrip(trip.id)}>{t('Terbitkan')}</button>}
    </div>}
  </article>
  return <main className="content profile-page organizer-page">
    <span className="eyebrow">{t('RUANG ORGANIZER')}</span><h1>{t('Kelola trip')}</h1>
    <p className="organizer-intro">{t('Buat draft untuk meninjau detailnya, atau terbitkan agar langsung terlihat di halaman Jelajahi.')}</p>
    <div className="trip-manager-layout">
      <form key={editingTrip?.id ?? 'new-trip'} className="panel trip-form" onSubmit={onSaveTrip}>
        <h2>{t(editingTrip ? 'Edit trip' : 'Buat trip baru')}</h2>
        <label>{t('JUDUL TRIP')}<input name="title" defaultValue={editingTrip?.title ?? ''} minLength={3} maxLength={140} required placeholder={t('Contoh: Jelajah Kawah Ijen')} /></label>
        <label>{t('SLUG URL')}<input name="slug" defaultValue={editingTrip?.slug ?? ''} pattern="[a-z0-9]+(-[a-z0-9]+)*" required placeholder="jelajah-kawah-ijen" /><small>{t('Huruf kecil, angka, dan tanda hubung. Harus unik.')}</small></label>
        <label>{t('DESTINASI')}<input name="destination" defaultValue={editingTrip?.destination ?? ''} minLength={2} maxLength={120} required placeholder="Banyuwangi, Jawa Timur" /></label>
        <label>{t('KATEGORI TRIP')}<select name="category" defaultValue={editingTrip?.category ?? 'nature'} required>{travelCategories.map(category => <option key={category.id} value={category.id}>{t(category.name)}</option>)}</select></label>
        <label>{t('DESKRIPSI')}<textarea name="description" defaultValue={editingTrip?.description ?? ''} maxLength={5000} rows={5} placeholder={t('Jadwal, perlengkapan, dan gambaran perjalanan')} /></label>
        <div className="trip-form-grid">
          <label>{t('MULAI')}<input type="datetime-local" name="starts_at" defaultValue={editingTrip ? toDateTimeLocal(editingTrip.starts_at) : ''} required /></label>
          <label>{t('SELESAI')}<input type="datetime-local" name="ends_at" defaultValue={editingTrip ? toDateTimeLocal(editingTrip.ends_at) : ''} required /></label>
          <label>{t('HARGA PER ORANG')}<input type="number" name="price" defaultValue={editingTrip?.price ?? ''} min="0" step="0.01" required placeholder="1250000" /></label>
          <label>{t('MATA UANG')}<input name="currency" defaultValue={editingTrip?.currency ?? 'IDR'} minLength={3} maxLength={3} pattern="[A-Za-z]{3}" required /></label>
          <label>{t('KAPASITAS')}<input type="number" name="capacity" defaultValue={editingTrip?.capacity ?? ''} min="1" step="1" required placeholder="10" /></label>
        </div>
        <label>{t('UPLOAD SAMPUL (OPSIONAL)')}<input type="file" name="cover_image" accept="image/jpeg,image/png,image/webp" /><small>{t('JPG, PNG, atau WebP · maks. 8 MB.')}{editingTrip?.cover_image_url ? ` ${t('Sampul saat ini:')} ${editingTrip.cover_image_url}` : ''}</small></label>
        <div className="trip-form-actions">{editingTrip && <button className="text-button" type="button" onClick={() => onEditingTrip(null)}>{t('Batal edit')}</button>}<button className="outline-button" type="submit" name="status" value="draft" disabled={savingTrip}>{savingTrip ? t('Menyimpan…') : t('Simpan draft')}</button><button className="primary-button" type="submit" name="status" value="published" disabled={savingTrip}>{savingTrip ? t('Menyimpan…') : t('Terbitkan trip')}</button></div>
        <small>{t('Trip harus memiliki jadwal mulai di masa depan dan kapasitas lebih dari nol.')}</small>
      </form>
      <section className="managed-trips">
        <h2>{t('Trip aktif & draft')}</h2>
        {loadingTrips ? <div className="empty-state">{t('Memuat trip…')}</div> : currentTrips.length
          ? <div className="managed-trip-list">{currentTrips.map(trip => renderTrip(trip))}</div>
          : <div className="empty-state"><strong>{t('Belum ada trip aktif.')}</strong><p>{t('Trip yang Anda buat akan muncul di sini.')}</p></div>}
      </section>
      {archivedTrips.length > 0 && <section className="managed-trips organizer-trip-archive">
        <h2>{t('Arsip trip')}</h2>
        <p className="organizer-intro">{t('Trip yang tanggal mulainya sudah lewat disimpan di sini dan tidak lagi ditawarkan untuk booking.')}</p>
        <div className="managed-trip-list">{archivedTrips.map(trip => renderTrip(trip, true))}</div>
      </section>}
    </div>
    <section className="managed-trips organizer-game-rooms"><h2>{t('Ruang cerita anonim')}</h2><p className="organizer-intro">{t('Buka satu prompt untuk peserta dengan booking confirmed. Jawaban tampil anonim dan dapat dimoderasi dari ruang tersebut.')}</p>
      {eligibleTrips.length > 0 && <form className="panel game-room-create" onSubmit={onCreateRoom}><label>{t('TRIP')}<select value={newGameTripId} onChange={event => onGameTripChange(event.target.value)} required><option value="">{t('Pilih trip terbit')}</option>{eligibleTrips.map(trip => <option value={trip.id} key={trip.id}>{trip.title} · {trip.destination}</option>)}</select></label><label>{t('PROMPT UNTUK PESERTA')}<textarea value={newGamePrompt} onChange={event => onPromptChange(event.target.value)} minLength={10} maxLength={500} rows={3} required placeholder={t('Apa cerita kecil yang ingin kamu bawa pulang?')} /></label><button className="primary-button" type="submit" disabled={creatingGameRoom}>{creatingGameRoom ? t('Membuat ruang…') : t('Buat ruang cerita')}</button></form>}
      {rooms.length ? <div className="game-room-list">{rooms.map(room => <article className="panel game-room-row" key={room.id}><div><span className={`status-pill ${room.status === 'open' ? 'status-published' : 'status-expired'}`}>{t(room.status === 'open' ? 'terbuka' : 'selesai')}</span><h3>{room.trip?.title ?? 'Trip'}</h3><p>{room.prompt}</p></div><button className="outline-button" onClick={() => onOpenRoom(room.id)}>{t('Kelola ruang')}</button></article>)}</div> : <div className="empty-state">{t('Belum ada ruang cerita untuk trip Anda.')}</div>}
    </section>
    <section className="managed-trips organizer-bookings"><div className="section-heading"><h2>{t('Booking peserta di trip saya')}</h2><Link className="text-button" to="/organizer/bookings">{t('Lihat semua booking →')}</Link></div>{bookings.length ? <div className="booking-list">{bookings.slice(0, 3).map(booking => <article className="panel participant-row" key={booking.id}><div><span className="eyebrow">{booking.trip?.title ?? 'Trip'}</span><p>{booking.traveler?.display_name ?? `Traveler ${booking.traveler_id.slice(0, 8)}…`} · {booking.quantity} {t('peserta')}</p></div><div className="booking-row-side"><span className={`status-pill status-${booking.status}`}>{t(booking.status.replace('_', ' '))}</span><strong>{formatMoney(booking.total_amount, booking.currency, locale)}</strong><small>{booking.payment ? `${t('Pembayaran')} ${t(booking.payment.status)} (${booking.payment.provider})` : t('Belum dibayar')}</small></div></article>)}</div> : <div className="empty-state">{t('Belum ada booking untuk trip Anda.')}</div>}</section>
  </main>
}
