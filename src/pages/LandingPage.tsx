import type { Filters, Trip } from '../types'
import TripCard from '../components/TripCard'

type Props = {
  trips: Trip[]
  visibleTrips: Trip[]
  filters: Filters
  loading: boolean
  error: string
  onFiltersChange: (filters: Filters) => void
  onRetry: () => void
  onSelectTrip: (trip: Trip) => boolean
}

export default function LandingPage({ trips, visibleTrips, filters, loading, error, onFiltersChange, onRetry, onSelectTrip }: Props) {
  return <>
    <main className="content">
      <section className="hero"><div className="hero-copy"><span className="eyebrow">KELUAR SEBENTAR, PULANG BAWA CERITA</span><h1>Jalan-jalan yang<br /><em>punya cerita.</em></h1><p>Temukan petualangan kecil, perjalanan jauh, dan teman baru di sepanjang jalan.</p><a className="primary-button hero-cta" href="#explore">Jelajahi trip <span>↓</span></a></div><div className="hero-stamp"><span>WAKTUNYA</span><strong>BERANGKAT</strong><span>INDONESIA, BEYOND THE ORDINARY</span></div></section>
      <section id="explore" className="explore-section">
        <div className="section-heading"><div><span className="eyebrow">KURASI PERJALANAN</span><h2>Ke mana kali ini?</h2></div><span className="trip-count">{visibleTrips.length} trip ditemukan</span></div>
        <div className="filter-panel">
          <label>DESTINASI<input value={filters.destination} onChange={event => onFiltersChange({ ...filters, destination: event.target.value })} placeholder="Contoh: Lombok" /></label>
          <label>BERANGKAT SETELAH<input type="date" value={filters.from} onChange={event => onFiltersChange({ ...filters, from: event.target.value })} /></label>
          <label>MATA UANG<select value={filters.currency} onChange={event => onFiltersChange({ ...filters, currency: event.target.value })}><option value="">Semua mata uang</option>{[...new Set(['IDR', ...trips.map(trip => trip.currency)])].map(currency => <option key={currency} value={currency}>{currency}</option>)}</select></label>
          <label>HARGA MAKSIMAL ({filters.currency || '—'})<input type="number" min="0" inputMode="numeric" value={filters.maxPrice} onChange={event => onFiltersChange({ ...filters, maxPrice: event.target.value })} placeholder={filters.currency || 'Pilih mata uang'} disabled={!filters.currency} /></label>
          <button className="text-button clear-filters" onClick={() => onFiltersChange({ destination: '', from: '', currency: 'IDR', maxPrice: '' })}>Hapus filter</button>
        </div>
        {loading ? <div className="empty-state">Mencari perjalanan untukmu…</div> : error ? <div className="empty-state"><p>{error}</p><button className="text-button" onClick={onRetry}>Coba lagi</button></div> : visibleTrips.length ? <div className="trip-grid">{visibleTrips.map(trip => <TripCard key={trip.id} trip={trip} onSelect={() => onSelectTrip(trip)} />)}</div> : <div className="empty-state"><strong>Belum ada trip yang cocok.</strong><p>Coba ubah filter, atau kembali lagi nanti.</p></div>}
      </section>
    </main>
    <footer className="site-footer"><span>Camply</span><span>Jalan-jalan yang punya cerita.</span><span>Made for the curious · Indonesia</span></footer>
  </>
}
