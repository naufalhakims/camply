import type { Trip } from '../types'
import { formatDate, formatMoney } from '../lib/format'
import { Link } from 'react-router-dom'

export default function TripCard({ trip, onSelect }: { trip: Trip; onSelect: () => boolean }) {
  return (
    <article className="trip-card">
      <Link className="trip-card-button" to={`/trips/${encodeURIComponent(trip.slug)}`} onClick={event => { if (!onSelect()) event.preventDefault() }} aria-label={`Lihat trip ${trip.title}`}>
        <div className="trip-image" style={trip.cover_image_url ? { backgroundImage: `url(${trip.cover_image_url})` } : undefined}>
          <span className="trip-tag">{trip.destination}</span><span className="image-index">CAMPly · TRIP</span>
        </div>
        <div className="trip-card-body">
          <div className="trip-date">{formatDate(trip.starts_at)} — {formatDate(trip.ends_at)}</div>
          <h3>{trip.title}</h3>
          <div className="trip-card-footer"><span>{formatMoney(trip.price, trip.currency)} <small>/ orang</small></span><span className="arrow-circle">↗</span></div>
        </div>
      </Link>
    </article>
  )
}
