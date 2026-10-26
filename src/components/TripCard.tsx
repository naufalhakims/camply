import type { Trip } from '../types'
import { formatDate, formatMoney } from '../lib/format'
import { Link } from 'react-router-dom'
import { travelCategories } from '../data/travelCategories'
import { useLanguage } from '../lib/i18n'

export default function TripCard({ trip, onSelect }: { trip: Trip; onSelect: () => boolean }) {
  const { language, t } = useLanguage()
  const locale = language === 'en' ? 'en-US' : 'id-ID'
  return (
    <article className="trip-card">
      <Link className="trip-card-button" to={`/trips/${encodeURIComponent(trip.slug)}`} onClick={event => { if (!onSelect()) event.preventDefault() }} aria-label={`${t('Lihat trip')} ${trip.title}`}>
        <div className="trip-image" style={trip.cover_image_url ? { backgroundImage: `url(${trip.cover_image_url})` } : undefined}>
          <span className="trip-tag">{trip.destination}</span><span className="image-index">CAMPly · TRIP</span>
        </div>
        <div className="trip-card-body">
          <span className="trip-category-label">{t(travelCategories.find(category => category.id === trip.category)?.name ?? 'Lainnya')}</span>
          <div className="trip-date">{formatDate(trip.starts_at, locale)} — {formatDate(trip.ends_at, locale)}</div>
          <h3>{trip.title}</h3>
          <div className="trip-card-footer"><span>{formatMoney(trip.price, trip.currency, locale)} <small>/ {t('orang')}</small></span><span className="arrow-circle">↗</span></div>
        </div>
      </Link>
    </article>
  )
}
