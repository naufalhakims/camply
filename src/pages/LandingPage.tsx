import type { Filters, Trip } from '../types'
import { travelCategories, summerHeroImage } from '../data/travelCategories'
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
  function selectCategory(category: Filters['category']) {
    onFiltersChange({ ...filters, category })
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return <>
    <main className="content landing-page">
      <section className="hero">
        <img className="hero-photo" src={summerHeroImage.url} alt={summerHeroImage.alt} fetchPriority="high" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-copy">
          <span className="eyebrow hero-kicker">MUSIM PANAS, CERITA BARU</span>
          <h1>Waktunya<br />cari <em>suasana.</em></h1>
          <p>Dari udara pegunungan sampai senja di pantai. Pilih perjalanan yang terasa seperti liburanmu.</p>
          <a className="primary-button hero-cta" href="#categories">Temukan suasananya <span>↓</span></a>
          <a className="hero-photo-credit" href={summerHeroImage.photoUrl} target="_blank" rel="noreferrer">Foto {summerHeroImage.photographer} · Unsplash</a>
        </div>
        <div className="hero-location"><span>01 / 06</span><span>INDONESIA · SUMMER ESCAPES</span></div>
      </section>

      <section id="categories" className="travel-categories">
        <div className="section-heading category-heading">
          <div><span className="eyebrow">PILIH MOOD LIBURANMU</span><h2>Ke mana hati ingin pergi?</h2></div>
          <button className="text-button" onClick={() => selectCategory('')}>Lihat semua trip <span>↗</span></button>
        </div>
        <div className="category-grid">
          {travelCategories.filter(category => category.id !== 'other').map(category => {
            const tripCount = trips.filter(trip => trip.category === category.id).length
            const selected = filters.category === category.id
            return <article className={`category-card ${selected ? 'category-card-selected' : ''}`} key={category.id}>
              <button className="category-card-button" onClick={() => selectCategory(selected ? '' : category.id)} aria-pressed={selected}>
                <img src={category.imageUrl} alt={category.imageAlt} loading="lazy" />
                <span className="category-card-shade" aria-hidden="true" />
                <span className="category-card-copy">
                  <span className="category-trip-count">{tripCount} trip</span>
                  <strong>{category.name}</strong>
                  <span>{category.description}</span>
                </span>
                <span className="category-arrow" aria-hidden="true">↗</span>
              </button>
              <a className="category-photo-credit" href={category.photoUrl} target="_blank" rel="noreferrer">Foto {category.photographer} · Unsplash</a>
            </article>
          })}
        </div>
      </section>

      <section id="explore" className="explore-section">
        <div className="section-heading"><div><span className="eyebrow">KURASI PERJALANAN</span><h2>Trip yang menunggumu</h2></div><span className="trip-count">{visibleTrips.length} trip ditemukan</span></div>
        <div className="filter-panel">
          <label>DESTINASI<input value={filters.destination} onChange={event => onFiltersChange({ ...filters, destination: event.target.value })} placeholder="Contoh: Lombok" /></label>
          <label>KATEGORI<select value={filters.category} onChange={event => onFiltersChange({ ...filters, category: event.target.value as Filters['category'] })}><option value="">Semua suasana</option>{travelCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>BERANGKAT SETELAH<input type="date" value={filters.from} onChange={event => onFiltersChange({ ...filters, from: event.target.value })} /></label>
          <label>MATA UANG<select value={filters.currency} onChange={event => onFiltersChange({ ...filters, currency: event.target.value })}><option value="">Semua mata uang</option>{[...new Set(['IDR', ...trips.map(trip => trip.currency)])].map(currency => <option key={currency} value={currency}>{currency}</option>)}</select></label>
          <label>HARGA MAKSIMAL ({filters.currency || '—'})<input type="number" min="0" inputMode="numeric" value={filters.maxPrice} onChange={event => onFiltersChange({ ...filters, maxPrice: event.target.value })} placeholder={filters.currency || 'Pilih mata uang'} disabled={!filters.currency} /></label>
          <button className="text-button clear-filters" onClick={() => onFiltersChange({ destination: '', category: '', from: '', currency: 'IDR', maxPrice: '' })}>Hapus filter</button>
        </div>
        {loading ? <div className="empty-state">Mencari perjalanan untukmu…</div> : error ? <div className="empty-state"><p>{error}</p><button className="text-button" onClick={onRetry}>Coba lagi</button></div> : visibleTrips.length ? <div className="trip-grid">{visibleTrips.map(trip => <TripCard key={trip.id} trip={trip} onSelect={() => onSelectTrip(trip)} />)}</div> : <div className="empty-state"><strong>Belum ada trip yang cocok.</strong><p>Coba ubah filter, atau kembali lagi nanti.</p></div>}
      </section>

      <section id="about" className="summer-values">
        <div className="summer-values-heading"><span className="eyebrow">RINGAN DIRANCANG, SERU DIJALANI</span><h2>Liburan punya banyak versi.</h2><p>Pilih trip yang pas, tahu detailnya dari awal, lalu pulang membawa cerita sendiri.</p></div>
        <div className="summer-value-grid">
          <article className="summer-value-card"><span className="value-number">01</span><span className="value-icon" aria-hidden="true">☼</span><h3>Mulai dari suasana</h3><p>Jelajahi alam, pantai, kota, budaya, atau petualangan lewat kategori trip.</p></article>
          <article className="summer-value-card"><span className="value-number">02</span><span className="value-icon" aria-hidden="true">↗</span><h3>Rencana lebih jelas</h3><p>Lihat tanggal, harga, kapasitas, dan sisa kursi sebelum memutuskan ikut.</p></article>
          <article className="summer-value-card"><span className="value-number">03</span><span className="value-icon" aria-hidden="true">✳</span><h3>Cerita berlanjut</h3><p>Untuk trip yang memiliki ruang cerita, peserta dapat berbagi jawaban anonim setelah booking confirmed.</p></article>
        </div>
        <a className="summer-values-link" href="#explore">Cari perjalanan musim panas <span>→</span></a>
      </section>
    </main>
    <footer className="site-footer"><span>Camply</span><span>Jalan-jalan yang punya cerita.</span><span>Foto kategori: Unsplash · Made for the curious · Indonesia</span></footer>
  </>
}
