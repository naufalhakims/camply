import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

type Trip = {
  id: string
  organizer_id: string
  slug: string
  title: string
  description: string | null
  destination: string
  starts_at: string
  ends_at: string
  price: number
  currency: string
  capacity: number
  status: 'draft' | 'published' | 'cancelled'
  cover_image_url: string | null
}

type Profile = {
  id: string
  display_name: string
  bio: string | null
}

type Booking = {
  id: string
  traveler_id: string
  trip_id: string
  quantity: number
  total_amount: number
  currency: string
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'expired'
  expires_at: string
  created_at: string
  trip: Pick<Trip, 'title' | 'destination' | 'starts_at' | 'ends_at'> | null
}

type Filters = { destination: string; from: string; currency: string; maxPrice: string }

const tripColumns = 'id,organizer_id,slug,title,description,destination,starts_at,ends_at,price,currency,capacity,status,cover_image_url'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(Number(value))
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authOpen, setAuthOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [filters, setFilters] = useState<Filters>({ destination: '', from: '', currency: 'IDR', maxPrice: '' })
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [page, setPage] = useState<'discover' | 'profile' | 'bookings'>('discover')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [quantity, setQuantity] = useState(1)
  const [bookingBusy, setBookingBusy] = useState(false)
  const [remainingSeats, setRemainingSeats] = useState<number | null>(null)
  const [loadingTrips, setLoadingTrips] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadTrips = useCallback(async () => {
    setLoadingTrips(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('trips')
      .select(tripColumns)
      .eq('status', 'published')
      .order('starts_at', { ascending: true })
    if (queryError) setError('Trip belum dapat dimuat. Periksa koneksi dan migrasi Supabase.')
    else { setError(''); setTrips((data ?? []) as Trip[]) }
    setLoadingTrips(false)
  }, [])

  useEffect(() => {
    let active = true
    const fetchTrips = async () => {
      const { data, error: queryError } = await supabase.from('trips').select(tripColumns).eq('status', 'published').order('starts_at', { ascending: true })
      if (!active) return
      if (queryError) setError('Trip belum dapat dimuat. Periksa koneksi dan migrasi Supabase.')
      else setTrips((data ?? []) as Trip[])
      setLoadingTrips(false)
    }
    void fetchTrips()
    return () => { active = false }
  }, [])

  const loadProfile = useCallback(async (currentUser: User | null) => {
    setUser(currentUser)
    setProfile(null)
    if (!currentUser) return
    setLoadingProfile(true)
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id,display_name,bio')
      .eq('id', currentUser.id)
      .maybeSingle()
    if (profileError) setError('Profil gagal dimuat.')
    else setProfile(data as Profile | null)
    setLoadingProfile(false)
  }, [])

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return
      if (sessionError) setError('Sesi gagal diperiksa. Silakan muat ulang halaman.')
      setSession(data.session)
      void loadProfile(data.session?.user ?? null)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      void loadProfile(nextSession?.user ?? null)
      if (!nextSession) setPage('discover')
    })
    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const loadBookings = useCallback(async () => {
    if (!user) return
    const { data, error: bookingError } = await supabase
      .from('bookings')
      .select('id,traveler_id,trip_id,quantity,total_amount,currency,status,expires_at,created_at,trip:trips(title,destination,starts_at,ends_at)')
      .eq('traveler_id', user.id)
      .order('created_at', { ascending: false })
    if (bookingError) setError('Booking gagal dimuat. Periksa apakah migrasi database sudah diterapkan.')
    else setBookings((data ?? []) as unknown as Booking[])
  }, [user])

  const visibleTrips = useMemo(() => {
    const destination = filters.destination.trim().toLocaleLowerCase('id-ID')
    const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : null
    return trips.filter((trip) => {
      const matchesDestination = !destination || trip.destination.toLocaleLowerCase('id-ID').includes(destination)
      const matchesDate = !filters.from || trip.starts_at.slice(0, 10) >= filters.from
      const matchesCurrency = !filters.currency || trip.currency === filters.currency
      const matchesPrice = maxPrice === null || (trip.currency === filters.currency && trip.price <= maxPrice)
      return matchesDestination && matchesDate && matchesCurrency && matchesPrice
    })
  }, [filters, trips])

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const displayName = String(form.get('displayName') ?? '').trim()
    if (password.length < 8) { setError('Kata sandi minimal 8 karakter.'); return }
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } })
      : await supabase.auth.signInWithPassword({ email, password })
    if (result.error) { setError(result.error.message); return }
    if (authMode === 'signup' && !result.data.session) {
      setNotice('Akun dibuat. Periksa email untuk menyelesaikan konfirmasi sebelum masuk.')
    } else {
      setNotice(authMode === 'signup' ? 'Akun berhasil dibuat.' : 'Berhasil masuk.')
      setAuthOpen(false)
    }
  }

  async function handleSignOut() {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError('Gagal keluar. Coba lagi.')
    else { setNotice('Anda telah keluar.'); setProfile(null); setUser(null); setSelectedTrip(null); setPage('discover') }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    const form = new FormData(event.currentTarget)
    const display_name = String(form.get('display_name') ?? '').trim()
    const bio = String(form.get('bio') ?? '').trim() || null
    if (display_name.length < 1 || display_name.length > 80 || (bio?.length ?? 0) > 500) {
      setError('Nama wajib diisi (maksimal 80 karakter), bio maksimal 500 karakter.')
      return
    }
    setError('')
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ display_name, bio })
      .eq('id', user.id)
      .select('id,display_name,bio')
      .single()
    if (updateError) setError('Profil gagal disimpan. Periksa migrasi dan koneksi Supabase.')
    else { setProfile(data as Profile); setNotice('Profil tersimpan.') }
  }

  async function reserveSeats() {
    if (!selectedTrip) return
    if (!session) { setAuthMode('signup'); setAuthOpen(true); return }
    setBookingBusy(true)
    setError('')
    const { error: reservationError } = await supabase.rpc('reserve_trip_seats', {
      p_trip_id: selectedTrip.id,
      p_quantity: quantity,
    })
    setBookingBusy(false)
    if (reservationError) {
      setError(reservationError.message.includes('Not enough seats')
        ? 'Kursi sebanyak itu sudah tidak tersedia. Pilih jumlah lain atau coba trip lain.'
        : reservationError.message.includes('unique')
          ? 'Kamu sudah memiliki booking aktif untuk trip ini.'
          : 'Booking gagal dibuat. Trip mungkin sudah tidak tersedia atau migrasi database belum diterapkan.')
      return
    }
    setSelectedTrip(null)
    await openBookings()
    setNotice('Kursi berhasil ditahan selama 15 menit. Selesaikan pembayaran saat alur pembayaran tersedia.')
  }

  async function cancelBooking(bookingId: string) {
    const { error: cancelError } = await supabase.rpc('cancel_pending_booking', { p_booking_id: bookingId })
    if (cancelError) setError('Booking tidak dapat dibatalkan. Mungkin masa penahanan sudah berakhir.')
    else { setNotice('Booking pending dibatalkan dan kursinya dilepas.'); await loadBookings() }
  }

  async function openTrip(trip: Trip) {
    setRemainingSeats(null)
    setQuantity(1)
    setSelectedTrip(trip)
    const { data, error: availabilityError } = await supabase.rpc('get_trip_seats_remaining', { p_trip_id: trip.id })
    if (availabilityError) setError('Sisa kursi belum dapat diperiksa. Booking tetap akan divalidasi saat dikirim.')
    else if (typeof data === 'number') {
      setRemainingSeats(data)
      setQuantity(current => Math.max(1, Math.min(current, Math.max(data, 1))))
    }
  }

  async function openBookings() {
    setPage('bookings')
    await loadBookings()
  }

  if (selectedTrip) {
    return <div className="app-shell"><Header session={session} profile={profile} onOpenAuth={() => { setAuthOpen(true); setAuthMode('signin') }} onProfile={() => { setSelectedTrip(null); setPage('profile') }} onBookings={() => { setSelectedTrip(null); void openBookings() }} onHome={() => setSelectedTrip(null)} onSignOut={handleSignOut} />
      <main className="content detail-page">
        <button className="text-button back-link" onClick={() => setSelectedTrip(null)}>← Kembali ke semua trip</button>
        <section className="detail-hero" style={selectedTrip.cover_image_url ? { backgroundImage: `linear-gradient(90deg, rgba(19,35,25,.75), rgba(19,35,25,.12)), url(${selectedTrip.cover_image_url})` } : undefined}>
          <span className="eyebrow">TRIP PILIHAN CAMPly</span><h1>{selectedTrip.title}</h1><p>{selectedTrip.destination} · {formatDate(selectedTrip.starts_at)} – {formatDate(selectedTrip.ends_at)}</p>
        </section>
        <div className="detail-grid"><article className="panel"><span className="eyebrow">TENTANG PERJALANAN</span><h2>Petualangan dimulai di sini.</h2><p className="description">{selectedTrip.description || 'Informasi perjalanan akan segera ditambahkan oleh organizer.'}</p></article>
          <aside className="panel booking-panel"><span className="eyebrow">HARGA PER ORANG</span><strong className="price">{formatMoney(selectedTrip.price, selectedTrip.currency)}</strong><p>Durasi {Math.max(1, Math.ceil((new Date(selectedTrip.ends_at).getTime() - new Date(selectedTrip.starts_at).getTime()) / 86400000))} hari · {remainingSeats === null ? 'Memeriksa kursi…' : `${remainingSeats} kursi tersisa`}</p><label className="quantity-label">JUMLAH PESERTA<input type="number" min="1" max={remainingSeats ?? selectedTrip.capacity} value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(remainingSeats ?? selectedTrip.capacity, Number(event.target.value) || 1)))} /></label><p className="booking-total">Total <strong>{formatMoney(selectedTrip.price * quantity, selectedTrip.currency)}</strong></p><button className="primary-button" disabled={bookingBusy || remainingSeats === 0} onClick={() => void reserveSeats()}>{bookingBusy ? 'Menahan kursi…' : remainingSeats === 0 ? 'Trip penuh' : 'Tahan kursi 15 menit'}</button><small className="hold-note">Pembayaran belum tersedia. Kursi akan ditahan sementara.</small></aside>
        </div>
      </main>
      <Feedback error={error} notice={notice} onDismiss={() => { setError(''); setNotice('') }} />
      {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} onSubmit={handleAuth} />}
    </div>
  }

  return <div className="app-shell"><Header session={session} profile={profile} onOpenAuth={() => { setAuthOpen(true); setAuthMode('signin') }} onProfile={() => setPage('profile')} onBookings={() => { void openBookings() }} onHome={() => setPage('discover')} onSignOut={handleSignOut} />
    {page === 'profile' && session ? <main className="content profile-page"><span className="eyebrow">AKUN ANDA</span><h1>Profil traveler</h1>{loadingProfile ? <p>Memuat profil…</p> : profile ? <form className="panel profile-form" onSubmit={saveProfile}><label>Nama tampilan<input name="display_name" maxLength={80} defaultValue={profile.display_name} required /></label><label>Bio<textarea name="bio" maxLength={500} rows={5} defaultValue={profile.bio ?? ''} placeholder="Ceritakan sedikit tentang diri Anda" /></label><button className="primary-button" type="submit">Simpan perubahan</button></form> : <p className="empty-state">Profil belum tersedia. Coba keluar lalu masuk kembali.</p>}</main> : page === 'bookings' && session ? <main className="content profile-page bookings-page"><span className="eyebrow">PERJALANAN ANDA</span><h1>Booking saya</h1>{bookings.length ? <div className="booking-list">{bookings.map(booking => { const expired = booking.status === 'pending_payment' && new Date(booking.expires_at) <= new Date(); const status = expired ? 'expired' : booking.status; return <article className="panel booking-row" key={booking.id}><div><span className="eyebrow">{booking.trip?.destination ?? 'Trip'}</span><h2>{booking.trip?.title ?? 'Trip'}</h2><p>{booking.trip ? `${formatDate(booking.trip.starts_at)} – ${formatDate(booking.trip.ends_at)}` : 'Trip detail tidak tersedia'} · {booking.quantity} peserta</p></div><div className="booking-row-side"><strong>{formatMoney(booking.total_amount, booking.currency)}</strong><span className={`status-pill status-${status}`}>{status.replace('_', ' ')}</span>{status === 'pending_payment' && <>{new Date(booking.expires_at) > new Date() && <small>Bayar sebelum {new Date(booking.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</small>}<button className="text-button" onClick={() => void cancelBooking(booking.id)}>Batalkan reservasi</button></>}</div></article> })}</div> : <div className="empty-state"><strong>Belum ada booking.</strong><p>Temukan perjalanan yang menarik untukmu.</p><button className="primary-button" onClick={() => setPage('discover')}>Jelajahi trip</button></div>}</main> : <>
      <main className="content">
        <section className="hero"><div className="hero-copy"><span className="eyebrow">KELUAR SEBENTAR, PULANG BAWA CERITA</span><h1>Jalan-jalan yang<br /><em>punya cerita.</em></h1><p>Temukan petualangan kecil, perjalanan jauh, dan teman baru di sepanjang jalan.</p><a className="primary-button hero-cta" href="#explore">Jelajahi trip <span>↓</span></a></div><div className="hero-stamp"><span>WAKTUNYA</span><strong>BERANGKAT</strong><span>INDONESIA, BEYOND THE ORDINARY</span></div></section>
        <section id="explore" className="explore-section"><div className="section-heading"><div><span className="eyebrow">KURASI PERJALANAN</span><h2>Ke mana kali ini?</h2></div><span className="trip-count">{visibleTrips.length} trip ditemukan</span></div>
          <div className="filter-panel"><label>DESTINASI<input value={filters.destination} onChange={event => setFilters({ ...filters, destination: event.target.value })} placeholder="Contoh: Lombok" /></label><label>BERANGKAT SETELAH<input type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} /></label><label>MATA UANG<select value={filters.currency} onChange={event => setFilters({ ...filters, currency: event.target.value })}><option value="">Semua mata uang</option>{[...new Set(['IDR', ...trips.map(trip => trip.currency)])].map(currency => <option key={currency} value={currency}>{currency}</option>)}</select></label><label>HARGA MAKSIMAL ({filters.currency || '—'})<input type="number" min="0" inputMode="numeric" value={filters.maxPrice} onChange={event => setFilters({ ...filters, maxPrice: event.target.value })} placeholder={filters.currency || 'Pilih mata uang'} disabled={!filters.currency} /></label><button className="text-button clear-filters" onClick={() => setFilters({ destination: '', from: '', currency: 'IDR', maxPrice: '' })}>Hapus filter</button></div>
          {loadingTrips ? <div className="empty-state">Mencari perjalanan untukmu…</div> : error ? <div className="empty-state"><p>{error}</p><button className="text-button" onClick={() => void loadTrips()}>Coba lagi</button></div> : visibleTrips.length ? <div className="trip-grid">{visibleTrips.map(trip => <TripCard key={trip.id} trip={trip} onSelect={() => void openTrip(trip)} />)}</div> : <div className="empty-state"><strong>Belum ada trip yang cocok.</strong><p>Coba ubah filter, atau kembali lagi nanti.</p></div>}
        </section>
      </main>
      <footer className="site-footer"><span>Camply</span><span>Jalan-jalan yang punya cerita.</span><span>Made for the curious · Indonesia</span></footer>
    </>}
    {!authReady && <div className="session-loading">Memeriksa sesi…</div>}
    <Feedback error={error} notice={notice} onDismiss={() => { setError(''); setNotice('') }} />
    {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} onSubmit={handleAuth} />}
  </div>
}

function Header({ session, profile, onOpenAuth, onProfile, onBookings, onHome, onSignOut }: { session: Session | null; profile: Profile | null; onOpenAuth: () => void; onProfile: () => void; onBookings: () => void; onHome: () => void; onSignOut: () => void }) {
  return <header className="site-header"><button className="brand" onClick={onHome} aria-label="Camply beranda"><span className="brand-mark">c</span><span>camply<span className="brand-period">.</span></span></button><nav><a href="#explore" onClick={onHome}>Cari trip</a><a href="#about">Tentang</a></nav><div className="header-actions">{session ? <><button className="profile-link" onClick={onBookings}>Booking</button><button className="profile-link" onClick={onProfile}>{profile?.display_name ?? 'Akun'}</button><button className="outline-button" onClick={onSignOut}>Keluar</button></> : <><button className="text-button signin-link" onClick={onOpenAuth}>Masuk</button><button className="outline-button" onClick={onOpenAuth}>Mulai eksplorasi <span>↗</span></button></>}</div></header>
}

function TripCard({ trip, onSelect }: { trip: Trip; onSelect: () => void }) {
  return <article className="trip-card"><button className="trip-card-button" onClick={onSelect} aria-label={`Lihat trip ${trip.title}`}><div className="trip-image" style={trip.cover_image_url ? { backgroundImage: `url(${trip.cover_image_url})` } : undefined}><span className="trip-tag">{trip.destination}</span><span className="image-index">CAMPly · TRIP</span></div><div className="trip-card-body"><div className="trip-date">{formatDate(trip.starts_at)} — {formatDate(trip.ends_at)}</div><h3>{trip.title}</h3><div className="trip-card-footer"><span>{formatMoney(trip.price, trip.currency)} <small>/ orang</small></span><span className="arrow-circle">↗</span></div></div></button></article>
}

function AuthModal({ mode, setMode, onClose, onSubmit }: { mode: 'signin' | 'signup'; setMode: (mode: 'signin' | 'signup') => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" aria-label="Tutup" onClick={onClose}>×</button><span className="eyebrow">SELAMAT DATANG DI CAMPLY</span><h2 id="auth-title">{mode === 'signin' ? 'Senang bertemu lagi.' : 'Perjalananmu dimulai di sini.'}</h2><p>{mode === 'signin' ? 'Masuk untuk melihat akun dan booking-mu.' : 'Buat akun traveler untuk mulai menjelajah.'}</p><form onSubmit={onSubmit}>{mode === 'signup' && <label>Nama tampilan<input name="displayName" autoComplete="name" required maxLength={80} /></label>}<label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Kata sandi<input name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required /></label><button className="primary-button" type="submit">{mode === 'signin' ? 'Masuk' : 'Buat akun'}</button></form><p className="auth-switch">{mode === 'signin' ? 'Belum punya akun?' : 'Sudah punya akun?'} <button className="text-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Daftar' : 'Masuk'}</button></p></section></div>
}

function Feedback({ error, notice, onDismiss }: { error: string; notice: string; onDismiss: () => void }) {
  if (!error && !notice) return null
  return <div className={`feedback ${error ? 'feedback-error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}<button onClick={onDismiss} aria-label="Tutup notifikasi">×</button></div>
}

export default App
