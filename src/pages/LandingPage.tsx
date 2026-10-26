import type { Filters, Trip } from '../types'
import { travelCategories, summerHeroImage } from '../data/travelCategories'
import TripCard from '../components/TripCard'
import { useLanguage } from '../lib/i18n'
import { TripFilterDate, TripFilterSelect } from '../components/TripFilterControls'

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
  const { t } = useLanguage()
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
          <span className="eyebrow hero-kicker">{t('MUSIM PANAS, CERITA BARU')}</span>
          <h1>{t('Waktunya')}<br /><em>{t('cari suasana.')}</em></h1>
          <p>{t('Dari udara pegunungan sampai senja di pantai. Pilih perjalanan yang terasa seperti liburanmu.')}</p>
          <a className="primary-button hero-cta" href="#categories">{t('Temukan suasananya')} <span>↓</span></a>
        </div>
      </section>

      <section id="categories" className="travel-categories">
        <div className="section-heading category-heading">
          <div><span className="eyebrow">{t('PILIH MOOD LIBURANMU')}</span><h2>{t('Ke mana hati ingin pergi?')}</h2></div>
          <button className="text-button" onClick={() => selectCategory('')}>{t('Lihat semua trip')} <span>↗</span></button>
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
                  <span className="category-trip-count">{tripCount} {t('trip')}</span>
                  <strong>{t(category.name)}</strong>
                  <span>{t(category.description)}</span>
                </span>
                <span className="category-arrow" aria-hidden="true">↗</span>
              </button>
            </article>
          })}
        </div>
      </section>

      <section id="explore" className="explore-section">
        <div className="section-heading"><div><span className="eyebrow">{t('KURASI PERJALANAN')}</span><h2>{t('Trip yang menunggumu')}</h2></div><span className="trip-count">{visibleTrips.length} {t('trip ditemukan')}</span></div>
        <div className="filter-panel">
          <label>{t('DESTINASI')}<input value={filters.destination} onChange={event => onFiltersChange({ ...filters, destination: event.target.value })} placeholder={t('Contoh: Lombok')} /></label>
          <label className="filter-select-field filter-category-field">{t('KATEGORI')}<TripFilterSelect label={t('Pilih kategori')} value={filters.category} options={[{ value: '', label: t('Semua suasana') }, ...travelCategories.map(category => ({ value: category.id, label: t(category.name) }))]} onChange={category => onFiltersChange({ ...filters, category: category as Filters['category'] })} /></label>
          <label className="filter-date-field">{t('BERANGKAT SETELAH')}<TripFilterDate value={filters.from} onChange={from => onFiltersChange({ ...filters, from })} /></label>
          <label className="filter-select-field filter-currency-field">{t('MATA UANG')}<TripFilterSelect label={t('Pilih mata uang')} value={filters.currency} options={[{ value: '', label: t('Semua mata uang') }, ...[...new Set(['IDR', ...trips.map(trip => trip.currency)])].map(currency => ({ value: currency, label: currency }))]} onChange={currency => onFiltersChange({ ...filters, currency })} /></label>
          <label>{t('HARGA MAKSIMAL')} ({filters.currency || '—'})<input type="number" min="0" inputMode="numeric" value={filters.maxPrice} onChange={event => onFiltersChange({ ...filters, maxPrice: event.target.value })} placeholder={filters.currency || t('Pilih mata uang')} disabled={!filters.currency} /></label>
          <button className="text-button clear-filters" onClick={() => onFiltersChange({ destination: '', category: '', from: '', currency: 'IDR', maxPrice: '' })}>{t('Hapus filter')}</button>
        </div>
        {loading ? <div className="empty-state">{t('Mencari perjalanan untukmu…')}</div> : error ? <div className="empty-state"><p>{t(error)}</p><button className="text-button" onClick={onRetry}>{t('Coba lagi')}</button></div> : visibleTrips.length ? <div className="trip-grid">{visibleTrips.map(trip => <TripCard key={trip.id} trip={trip} onSelect={() => onSelectTrip(trip)} />)}</div> : <div className="empty-state"><strong>{t('Belum ada trip yang cocok.')}</strong><p>{t('Coba ubah filter, atau kembali lagi nanti.')}</p></div>}
      </section>

      <section id="about" className="summer-values">
        <div className="summer-values-heading"><span className="eyebrow">{t('RINGAN DIRANCANG, SERU DIJALANI')}</span><h2>{t('Liburan punya banyak versi.')}</h2><p>{t('Pilih trip yang pas, tahu detailnya dari awal, lalu pulang membawa cerita sendiri.')}</p></div>
        <div className="summer-value-grid">
          <article className="summer-value-card"><span className="value-number">01</span><span className="value-icon" aria-hidden="true">☼</span><h3>{t('Mulai dari suasana')}</h3><p>{t('Jelajahi alam, pantai, kota, budaya, atau petualangan lewat kategori trip.')}</p></article>
          <article className="summer-value-card"><span className="value-number">02</span><span className="value-icon" aria-hidden="true">↗</span><h3>{t('Rencana lebih jelas')}</h3><p>{t('Lihat tanggal, harga, kapasitas, dan sisa kursi sebelum memutuskan ikut.')}</p></article>
          <article className="summer-value-card"><span className="value-number">03</span><span className="value-icon" aria-hidden="true">✳</span><h3>{t('Cerita berlanjut')}</h3><p>{t('Untuk trip yang memiliki ruang cerita, peserta dapat berbagi jawaban anonim setelah booking confirmed.')}</p></article>
        </div>
        <a className="summer-values-link" href="#explore">{t('Cari perjalanan musim panas')} <span>→</span></a>
      </section>
    </main>
    <footer className="site-footer"><span>Camply</span><span>{t('Jalan-jalan yang punya cerita.')}</span><span>Made for the curious · Indonesia</span></footer>
  </>
}
