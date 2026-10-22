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
  role: 'traveler' | 'organizer' | 'admin'
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
  payment: { provider: string; status: string } | null
}

type Filters = { destination: string; from: string; currency: string; maxPrice: string }

const tripColumns = 'id,organizer_id,slug,title,description,destination,starts_at,ends_at,price,currency,capacity,status,cover_image_url'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(Number(value))
}

function toDateTimeLocal(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
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
  const [page, setPage] = useState<'discover' | 'profile' | 'bookings' | 'organizer' | 'admin'>('discover')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [managedTrips, setManagedTrips] = useState<Trip[]>([])
  const [managedBookings, setManagedBookings] = useState<Booking[]>([])
  const [adminTrips, setAdminTrips] = useState<Trip[]>([])
  const [adminBookings, setAdminBookings] = useState<Booking[]>([])
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [loadingManagedTrips, setLoadingManagedTrips] = useState(false)
  const [savingTrip, setSavingTrip] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [bookingBusy, setBookingBusy] = useState(false)
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null)
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null)
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
    else if (data) {
      const { data: role, error: roleError } = await supabase.rpc('current_app_role')
      if (roleError || !['traveler', 'organizer', 'admin'].includes(String(role))) setError('Role akun gagal diperiksa.')
      else setProfile({ ...data, role } as Profile)
    }
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
      .select('id,traveler_id,trip_id,quantity,total_amount,currency,status,expires_at,created_at,trip:trips(title,destination,starts_at,ends_at),payment:payments(provider,status)')
      .eq('traveler_id', user.id)
      .order('created_at', { ascending: false })
    if (bookingError) setError('Booking gagal dimuat. Periksa apakah migrasi database sudah diterapkan.')
    else setBookings((data ?? []) as unknown as Booking[])
  }, [user])

  const loadManagedTrips = useCallback(async () => {
    if (!user) return
    setLoadingManagedTrips(true)
    const { data, error: tripsError } = await supabase
      .from('trips')
      .select(tripColumns)
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false })
    if (tripsError) setError('Trip yang Anda kelola gagal dimuat. Periksa migrasi Supabase.')
    else setManagedTrips((data ?? []) as Trip[])
    setLoadingManagedTrips(false)
  }, [user])

  const loadManagedBookings = useCallback(async () => {
    if (!user) return
    const { data, error: queryError } = await supabase
      .from('bookings')
      .select('id,traveler_id,trip_id,quantity,total_amount,currency,status,expires_at,created_at,trip:trips(title,destination,starts_at,ends_at),payment:payments(provider,status)')
      .order('created_at', { ascending: false })
    if (queryError) setError('Peserta trip gagal dimuat.')
    else setManagedBookings((data ?? []) as unknown as Booking[])
  }, [user])

  const loadAdminDashboard = useCallback(async () => {
    if (!user || profile?.role !== 'admin') return
    const [tripResult, bookingResult] = await Promise.all([
      supabase.from('trips').select(tripColumns).order('created_at', { ascending: false }),
      supabase.from('bookings')
        .select('id,traveler_id,trip_id,quantity,total_amount,currency,status,expires_at,created_at,trip:trips(title,destination,starts_at,ends_at),payment:payments(provider,status)')
        .order('created_at', { ascending: false }),
    ])
    if (tripResult.error || bookingResult.error) setError('Data operasional admin gagal dimuat.')
    else {
      setAdminTrips((tripResult.data ?? []) as Trip[])
      setAdminBookings((bookingResult.data ?? []) as unknown as Booking[])
    }
  }, [profile?.role, user])

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
    const signupRole = form.get('signupRole') === 'organizer' ? 'organizer' : 'traveler'
    if (password.length < 8) { setError('Kata sandi minimal 8 karakter.'); return }
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName, signup_role: signupRole } } })
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
    else { setProfile({ ...data, role: profile?.role ?? 'traveler' } as Profile); setNotice('Profil tersimpan.') }
  }

  async function saveTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !['organizer', 'admin'].includes(profile?.role ?? '')) {
      setError('Hanya organizer yang dapat membuat trip. Hubungi admin untuk meminta akses organizer.')
      return
    }
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    const status = submitter instanceof HTMLButtonElement ? submitter.value : null
    const title = String(form.get('title') ?? '').trim()
    const slug = String(form.get('slug') ?? '').trim()
    const destination = String(form.get('destination') ?? '').trim()
    const description = String(form.get('description') ?? '').trim()
    const startsAt = new Date(String(form.get('starts_at') ?? ''))
    const endsAt = new Date(String(form.get('ends_at') ?? ''))
    const price = Number(form.get('price'))
    const currency = String(form.get('currency') ?? '').trim().toUpperCase()
    const capacity = Number(form.get('capacity'))
    const coverImageUrl = String(form.get('cover_image_url') ?? '').trim()
    if (title.length < 3 || title.length > 140 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
      || destination.length < 2 || destination.length > 120 || description.length > 5000
      || !Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())
      || startsAt <= new Date() || endsAt <= startsAt || !Number.isFinite(price) || price < 0
      || !/^[A-Z]{3}$/.test(currency) || !Number.isInteger(capacity) || capacity < 1
      || (coverImageUrl && !URL.canParse(coverImageUrl)) || !['draft', 'published'].includes(status ?? '')) {
      setError('Periksa kembali data trip. Tanggal mulai harus di masa depan dan tanggal selesai setelah tanggal mulai.')
      return
    }
    setSavingTrip(true)
    setError('')
    setNotice('')
    const tripValues = {
      slug,
      title,
      description: description || null,
      destination,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      price,
      currency,
      capacity,
      status,
      cover_image_url: coverImageUrl || null,
    }
    const saveResult = editingTrip
      ? await supabase.from('trips').update(tripValues).eq('id', editingTrip.id).eq('organizer_id', user.id)
      : await supabase.from('trips').insert({ organizer_id: user.id, ...tripValues })
    setSavingTrip(false)
    if (saveResult.error) {
      setError(saveResult.error.code === '23505'
        ? 'Slug sudah digunakan. Pilih slug lain yang unik.'
        : 'Trip gagal disimpan. Pastikan migrasi terbaru sudah diterapkan dan data valid.')
      return
    }
    formElement.reset()
    setEditingTrip(null)
    setNotice(editingTrip ? 'Perubahan trip berhasil disimpan.' : status === 'published' ? 'Trip berhasil diterbitkan dan tampil di daftar trip.' : 'Draft trip berhasil disimpan.')
    await loadManagedTrips()
    if (status === 'published' || editingTrip?.status === 'published') await loadTrips()
  }

  async function publishTrip(tripId: string) {
    if (!user) return
    setError('')
    const { error: publishError } = await supabase.from('trips')
      .update({ status: 'published' })
      .eq('id', tripId)
      .eq('organizer_id', user.id)
      .eq('status', 'draft')
    if (publishError) setError('Trip gagal diterbitkan. Periksa tanggal, kapasitas, dan kebijakan akses.')
    else {
      setNotice('Trip berhasil diterbitkan dan tampil di daftar trip.')
      await loadManagedTrips()
      await loadTrips()
    }
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
    setNotice('Kursi ditahan selama 15 menit. Selesaikan pembayaran simulasi dari halaman Booking.')
  }

  async function cancelBooking(bookingId: string) {
    const { error: cancelError } = await supabase.rpc('cancel_pending_booking', { p_booking_id: bookingId })
    if (cancelError) setError('Booking tidak dapat dibatalkan. Mungkin masa penahanan sudah berakhir.')
    else { setNotice('Booking pending dibatalkan dan kursinya dilepas.'); await loadBookings() }
  }

  async function completeMockPayment(bookingId: string) {
    setPayingBookingId(bookingId)
    setError('')
    const { error: paymentError } = await supabase.rpc('complete_mock_payment', {
      p_booking_id: bookingId,
    })
    setPayingBookingId(null)
    if (paymentError) {
      setError(paymentError.message.includes('no longer payable')
        ? 'Masa penahanan kursi berakhir atau booking sudah tidak dapat dibayar.'
        : 'Pembayaran simulasi gagal. Periksa booking dan coba lagi.')
      return
    }
    setPaymentBooking(null)
    setNotice('Pembayaran simulasi berhasil. Tidak ada uang yang diproses.')
    await loadBookings()
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

  async function openOrganizer() {
    if (!['organizer', 'admin'].includes(profile?.role ?? '')) {
      setError('Akun traveler belum memiliki akses organizer.')
      return
    }
    setSelectedTrip(null)
    setPage('organizer')
    await Promise.all([loadManagedTrips(), loadManagedBookings()])
  }

  async function openAdmin() {
    if (profile?.role !== 'admin') {
      setError('Halaman ini hanya tersedia untuk admin.')
      return
    }
    setSelectedTrip(null)
    setPage('admin')
    await loadAdminDashboard()
  }

  async function cancelAdminTrip(tripId: string) {
    const { error: updateError } = await supabase.from('trips')
      .update({ status: 'cancelled' })
      .eq('id', tripId)
    if (updateError) setError('Trip gagal dibatalkan.')
    else {
      setNotice('Trip dibatalkan.')
      await Promise.all([loadAdminDashboard(), loadTrips()])
    }
  }

  if (selectedTrip) {
    return <div className="app-shell"><Header session={session} profile={profile} onOpenAuth={() => { setAuthOpen(true); setAuthMode('signin') }} onProfile={() => { setSelectedTrip(null); setPage('profile') }} onBookings={() => { setSelectedTrip(null); void openBookings() }} onManageTrips={() => void openOrganizer()} onAdmin={() => void openAdmin()} onHome={() => setSelectedTrip(null)} onSignOut={handleSignOut} />
      <main className="content detail-page">
        <button className="text-button back-link" onClick={() => setSelectedTrip(null)}>← Kembali ke semua trip</button>
        <section className="detail-hero" style={selectedTrip.cover_image_url ? { backgroundImage: `linear-gradient(90deg, rgba(19,35,25,.75), rgba(19,35,25,.12)), url(${selectedTrip.cover_image_url})` } : undefined}>
          <span className="eyebrow">TRIP PILIHAN CAMPly</span><h1>{selectedTrip.title}</h1><p>{selectedTrip.destination} · {formatDate(selectedTrip.starts_at)} – {formatDate(selectedTrip.ends_at)}</p>
        </section>
        <div className="detail-grid"><article className="panel"><span className="eyebrow">TENTANG PERJALANAN</span><h2>Petualangan dimulai di sini.</h2><p className="description">{selectedTrip.description || 'Informasi perjalanan akan segera ditambahkan oleh organizer.'}</p></article>
          <aside className="panel booking-panel"><span className="eyebrow">HARGA PER ORANG</span><strong className="price">{formatMoney(selectedTrip.price, selectedTrip.currency)}</strong><p>Durasi {Math.max(1, Math.ceil((new Date(selectedTrip.ends_at).getTime() - new Date(selectedTrip.starts_at).getTime()) / 86400000))} hari · {remainingSeats === null ? 'Memeriksa kursi…' : `${remainingSeats} kursi tersisa`}</p><label className="quantity-label">JUMLAH PESERTA<input type="number" min="1" max={remainingSeats ?? selectedTrip.capacity} value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(remainingSeats ?? selectedTrip.capacity, Number(event.target.value) || 1)))} /></label><p className="booking-total">Total <strong>{formatMoney(selectedTrip.price * quantity, selectedTrip.currency)}</strong></p><button className="primary-button" disabled={bookingBusy || remainingSeats === 0} onClick={() => void reserveSeats()}>{bookingBusy ? 'Menahan kursi…' : remainingSeats === 0 ? 'Trip penuh' : 'Tahan kursi 15 menit'}</button><small className="hold-note">Kursi ditahan 15 menit. Pembayaran tersedia sebagai simulasi mock.</small></aside>
        </div>
      </main>
      <Feedback error={error} notice={notice} onDismiss={() => { setError(''); setNotice('') }} />
      {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} onSubmit={handleAuth} />}
    </div>
  }

  return <div className="app-shell"><Header session={session} profile={profile} onOpenAuth={() => { setAuthOpen(true); setAuthMode('signin') }} onProfile={() => setPage('profile')} onBookings={() => { void openBookings() }} onManageTrips={() => void openOrganizer()} onAdmin={() => void openAdmin()} onHome={() => setPage('discover')} onSignOut={handleSignOut} />
    {page === 'organizer' && session && ['organizer', 'admin'].includes(profile?.role ?? '') ? <main className="content profile-page organizer-page"><span className="eyebrow">RUANG ORGANIZER</span><h1>Kelola trip</h1><p className="organizer-intro">Buat draft untuk meninjau detailnya, atau terbitkan agar langsung terlihat di halaman Jelajahi.</p><div className="trip-manager-layout"><form key={editingTrip?.id ?? "new-trip"} className="panel trip-form" onSubmit={saveTrip}><h2>{editingTrip ? "Edit trip" : "Buat trip baru"}</h2><label>JUDUL TRIP<input name="title" defaultValue={editingTrip?.title ?? ""} minLength={3} maxLength={140} required placeholder="Contoh: Jelajah Kawah Ijen" /></label><label>SLUG URL<input name="slug" defaultValue={editingTrip?.slug ?? ""} pattern="[a-z0-9]+(-[a-z0-9]+)*" required placeholder="jelajah-kawah-ijen" /><small>Huruf kecil, angka, dan tanda hubung. Harus unik.</small></label><label>DESTINASI<input name="destination" defaultValue={editingTrip?.destination ?? ""} minLength={2} maxLength={120} required placeholder="Banyuwangi, Jawa Timur" /></label><label>DESKRIPSI<textarea name="description" defaultValue={editingTrip?.description ?? ""} maxLength={5000} rows={5} placeholder="Jadwal, perlengkapan, dan gambaran perjalanan" /></label><div className="trip-form-grid"><label>MULAI<input type="datetime-local" name="starts_at" defaultValue={editingTrip ? toDateTimeLocal(editingTrip.starts_at) : ""} required /></label><label>SELESAI<input type="datetime-local" name="ends_at" defaultValue={editingTrip ? toDateTimeLocal(editingTrip.ends_at) : ""} required /></label><label>HARGA PER ORANG<input type="number" name="price" defaultValue={editingTrip?.price ?? ""} min="0" step="0.01" required placeholder="1250000" /></label><label>MATA UANG<input name="currency" defaultValue={editingTrip?.currency ?? "IDR"} minLength={3} maxLength={3} pattern="[A-Za-z]{3}" required /></label><label>KAPASITAS<input type="number" name="capacity" defaultValue={editingTrip?.capacity ?? ""} min="1" step="1" required placeholder="10" /></label></div><label>URL FOTO SAMPUL (OPSIONAL)<input type="url" name="cover_image_url" defaultValue={editingTrip?.cover_image_url ?? ""} placeholder="https://..." /></label><div className="trip-form-actions">{editingTrip && <button className="text-button" type="button" onClick={() => setEditingTrip(null)}>Batal edit</button>}<button className="outline-button" type="submit" name="status" value="draft" disabled={savingTrip}>{savingTrip ? 'Menyimpan…' : 'Simpan draft'}</button><button className="primary-button" type="submit" name="status" value="published" disabled={savingTrip}>{savingTrip ? 'Menyimpan…' : 'Terbitkan trip'}</button></div><small>Trip harus memiliki jadwal mulai di masa depan dan kapasitas lebih dari nol.</small></form><section className="managed-trips"><h2>Trip milik saya</h2>{loadingManagedTrips ? <div className="empty-state">Memuat trip…</div> : managedTrips.length ? <div className="managed-trip-list">{managedTrips.map(trip => <article className="panel managed-trip-row" key={trip.id}><div><span className={`status-pill status-${trip.status}`}>{trip.status}</span><h3>{trip.title}</h3><p>{trip.destination} · {formatDate(trip.starts_at)} – {formatDate(trip.ends_at)}</p><strong>{formatMoney(trip.price, trip.currency)} · kapasitas {trip.capacity}</strong></div><div className="managed-trip-actions"><button className="outline-button" onClick={() => setEditingTrip(trip)}>Edit</button>{trip.status === 'draft' && <button className="primary-button" onClick={() => void publishTrip(trip.id)}>Terbitkan</button>}</div></article>)}</div> : <div className="empty-state"><strong>Belum ada trip.</strong><p>Trip yang Anda buat akan muncul di sini.</p></div>}</section></div><section className="managed-trips organizer-bookings"><h2>Booking peserta di trip saya</h2>{managedBookings.length ? <div className="booking-list">{managedBookings.map(booking => <article className="panel participant-row" key={booking.id}><div><span className="eyebrow">{booking.trip?.title ?? 'Trip'}</span><p>Traveler {booking.traveler_id.slice(0, 8)}… · {booking.quantity} peserta</p></div><div className="booking-row-side"><span className={`status-pill status-${booking.status}`}>{booking.status.replace('_', ' ')}</span><strong>{formatMoney(booking.total_amount, booking.currency)}</strong><small>{booking.payment ? `Pembayaran ${booking.payment.status} (${booking.payment.provider})` : 'Belum dibayar'}</small></div></article>)}</div> : <div className="empty-state">Belum ada booking untuk trip Anda.</div>}</section></main> : page === 'admin' && session && profile?.role === 'admin' ? <main className="content profile-page admin-page"><span className="eyebrow">ADMINISTRASI CAMPLY</span><h1>Ringkasan operasional</h1><div className="admin-metrics"><article className="panel"><span className="eyebrow">TRIP</span><strong>{adminTrips.length}</strong></article><article className="panel"><span className="eyebrow">BOOKING</span><strong>{adminBookings.length}</strong></article><article className="panel"><span className="eyebrow">PEMBAYARAN TERCATAT</span><strong>{adminBookings.filter(booking => booking.payment).length}</strong></article></div><section className="managed-trips admin-records"><h2>Trip</h2>{adminTrips.length ? adminTrips.map(trip => <article className="panel managed-trip-row" key={trip.id}><div><span className={`status-pill status-${trip.status}`}>{trip.status}</span><h3>{trip.title}</h3><p>{trip.destination} · organizer {trip.organizer_id.slice(0, 8)}…</p><strong>{formatMoney(trip.price, trip.currency)} · kapasitas {trip.capacity}</strong></div>{trip.status !== 'cancelled' && <button className="text-button" onClick={() => void cancelAdminTrip(trip.id)}>Batalkan trip</button>}</article>) : <div className="empty-state">Belum ada trip.</div>}</section><section className="managed-trips admin-records"><h2>Booking dan pembayaran</h2>{adminBookings.length ? adminBookings.map(booking => <article className="panel participant-row" key={booking.id}><div><span className="eyebrow">{booking.trip?.title ?? 'Trip'}</span><p>Traveler {booking.traveler_id.slice(0, 8)}… · {booking.quantity} peserta</p></div><div className="booking-row-side"><span className={`status-pill status-${booking.status}`}>{booking.status.replace('_', ' ')}</span><strong>{formatMoney(booking.total_amount, booking.currency)}</strong><small>{booking.payment ? `Pembayaran ${booking.payment.status} (${booking.payment.provider})` : 'Belum dibayar'}</small></div></article>) : <div className="empty-state">Belum ada booking.</div>}</section></main> : page === 'profile' && session ? <main className="content profile-page"><span className="eyebrow">AKUN ANDA · <span className={`role-label role-${profile?.role ?? 'traveler'}`}>{profile?.role ?? 'traveler'}</span></span><h1>Profil {profile?.role === 'organizer' ? 'organizer' : profile?.role === 'admin' ? 'admin' : 'traveler'}</h1>{loadingProfile ? <p>Memuat profil…</p> : profile ? <form className="panel profile-form" onSubmit={saveProfile}><label>Nama tampilan<input name="display_name" maxLength={80} defaultValue={profile.display_name} required /></label><label>Bio<textarea name="bio" maxLength={500} rows={5} defaultValue={profile.bio ?? ''} placeholder="Ceritakan sedikit tentang diri Anda" /></label><button className="primary-button" type="submit">Simpan perubahan</button></form> : <p className="empty-state">Profil belum tersedia. Coba keluar lalu masuk kembali.</p>}</main> : page === 'bookings' && session ? <main className="content profile-page bookings-page"><span className="eyebrow">PERJALANAN ANDA</span><h1>Booking saya</h1>{bookings.length ? <div className="booking-list">{bookings.map(booking => { const expired = booking.status === 'pending_payment' && new Date(booking.expires_at) <= new Date(); const status = expired ? 'expired' : booking.status; return <article className="panel booking-row" key={booking.id}><div><span className="eyebrow">{booking.trip?.destination ?? 'Trip'}</span><h2>{booking.trip?.title ?? 'Trip'}</h2><p>{booking.trip ? `${formatDate(booking.trip.starts_at)} – ${formatDate(booking.trip.ends_at)}` : 'Trip detail tidak tersedia'} · {booking.quantity} peserta</p></div><div className="booking-row-side"><strong>{formatMoney(booking.total_amount, booking.currency)}</strong><span className={`status-pill status-${status}`}>{status.replace('_', ' ')}</span>{booking.payment?.provider === 'mock' && <small className="mock-payment-note">PEMBAYARAN SIMULASI · MOCK</small>}{status === 'pending_payment' && <>{new Date(booking.expires_at) > new Date() && <small>Bayar sebelum {new Date(booking.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</small>}<button className="primary-button mock-pay-button" onClick={() => setPaymentBooking(booking)}>Bayar simulasi</button><button className="text-button" onClick={() => void cancelBooking(booking.id)}>Batalkan reservasi</button></>}</div></article> })}</div> : <div className="empty-state"><strong>Belum ada booking.</strong><p>Temukan perjalanan yang menarik untukmu.</p><button className="primary-button" onClick={() => setPage('discover')}>Jelajahi trip</button></div>}</main> : <>
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
    {paymentBooking && <MockPaymentModal booking={paymentBooking} busy={payingBookingId === paymentBooking.id} onClose={() => setPaymentBooking(null)} onConfirm={() => void completeMockPayment(paymentBooking.id)} />}
  </div>
}

function Header({ session, profile, onOpenAuth, onProfile, onBookings, onManageTrips, onAdmin, onHome, onSignOut }: { session: Session | null; profile: Profile | null; onOpenAuth: () => void; onProfile: () => void; onBookings: () => void; onManageTrips: () => void; onAdmin: () => void; onHome: () => void; onSignOut: () => void }) {
  return <header className="site-header"><button className="brand" onClick={onHome} aria-label="Camply beranda"><span className="brand-mark">c</span><span>camply<span className="brand-period">.</span></span></button><nav><a href="#explore" onClick={onHome}>Cari trip</a><a href="#about">Tentang</a></nav><div className="header-actions">{session ? <><span className={`role-label role-${profile?.role ?? 'traveler'}`}>{profile?.role ?? 'traveler'}</span>{['organizer', 'admin'].includes(profile?.role ?? '') && <button className="profile-link" onClick={onManageTrips}>Kelola trip</button>}{profile?.role === 'admin' && <button className="profile-link" onClick={onAdmin}>Admin</button>}<button className="profile-link" onClick={onBookings}>Booking</button><button className="profile-link" onClick={onProfile}>{profile?.display_name ?? 'Akun'}</button><button className="outline-button" onClick={onSignOut}>Keluar</button></> : <><button className="text-button signin-link" onClick={onOpenAuth}>Masuk</button><button className="outline-button" onClick={onOpenAuth}>Mulai eksplorasi <span>↗</span></button></>}</div></header>
}

function TripCard({ trip, onSelect }: { trip: Trip; onSelect: () => void }) {
  return <article className="trip-card"><button className="trip-card-button" onClick={onSelect} aria-label={`Lihat trip ${trip.title}`}><div className="trip-image" style={trip.cover_image_url ? { backgroundImage: `url(${trip.cover_image_url})` } : undefined}><span className="trip-tag">{trip.destination}</span><span className="image-index">CAMPly · TRIP</span></div><div className="trip-card-body"><div className="trip-date">{formatDate(trip.starts_at)} — {formatDate(trip.ends_at)}</div><h3>{trip.title}</h3><div className="trip-card-footer"><span>{formatMoney(trip.price, trip.currency)} <small>/ orang</small></span><span className="arrow-circle">↗</span></div></div></button></article>
}

function AuthModal({ mode, setMode, onClose, onSubmit }: { mode: 'signin' | 'signup'; setMode: (mode: 'signin' | 'signup') => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" aria-label="Tutup" onClick={onClose}>×</button><span className="eyebrow">SELAMAT DATANG DI CAMPLY</span><h2 id="auth-title">{mode === 'signin' ? 'Senang bertemu lagi.' : 'Perjalananmu dimulai di sini.'}</h2><p>{mode === 'signin' ? 'Masuk untuk melihat akun dan booking-mu.' : 'Pilih cara kamu berpartisipasi di Camply.'}</p><form onSubmit={onSubmit}>{mode === 'signup' && <><label>Nama tampilan<input name="displayName" autoComplete="name" required maxLength={80} /></label><label>DAFTAR SEBAGAI<select name="signupRole" defaultValue="traveler"><option value="traveler">Traveler — cari dan booking trip</option><option value="organizer">Organizer — buat dan kelola trip</option></select></label><small className="signup-role-note">Pilihan ini berlaku saat akun dibuat. Role Admin hanya dapat diberikan oleh pemilik proyek.</small></>}<label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Kata sandi<input name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required /></label><button className="primary-button" type="submit">{mode === 'signin' ? 'Masuk' : 'Buat akun'}</button></form><p className="auth-switch">{mode === 'signin' ? 'Belum punya akun?' : 'Sudah punya akun?'} <button className="text-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Daftar' : 'Masuk'}</button></p></section></div>
}

function Feedback({ error, notice, onDismiss }: { error: string; notice: string; onDismiss: () => void }) {
  if (!error && !notice) return null
  return <div className={`feedback ${error ? 'feedback-error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}<button onClick={onDismiss} aria-label="Tutup notifikasi">×</button></div>
}

function MockPaymentModal({ booking, busy, onClose, onConfirm }: { booking: Booking; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose() }}><section className="auth-modal payment-modal" role="dialog" aria-modal="true" aria-labelledby="mock-payment-title"><button className="modal-close" aria-label="Tutup" onClick={onClose} disabled={busy}>×</button><span className="eyebrow">DEMO · MOCK PAYMENT</span><h2 id="mock-payment-title">Selesaikan booking</h2><p>Ini simulasi untuk portfolio. Tidak ada uang yang ditagih atau dikirim ke penyedia pembayaran.</p><div className="mock-payment-summary"><strong>{booking.trip?.title ?? 'Trip'}</strong><span>{booking.quantity} peserta</span><b>{formatMoney(booking.total_amount, booking.currency)}</b></div><button className="primary-button" disabled={busy} onClick={onConfirm}>{busy ? 'Memproses simulasi…' : 'Konfirmasi pembayaran simulasi'}</button><button className="text-button" disabled={busy} onClick={onClose}>Kembali</button></section></div>
}

export default App
