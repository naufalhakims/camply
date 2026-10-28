import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useLocation, useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import { supabase } from './lib/supabase'
import { uploadTripCover } from './lib/cloudinary'
import TripGamePage from './TripGamePage'
import type { Booking, Filters, Profile, Trip, TripGameRoom } from './types'
import { travelCategories } from './data/travelCategories'
import SiteHeader from './components/SiteHeader'
import AuthModal from './components/AuthModal'
import Feedback from './components/Feedback'
import MockPaymentModal from './components/MockPaymentModal'
import LandingPage from './pages/LandingPage'
import TripDetailsPage from './pages/TripDetailsPage'
import BookingsPage from './pages/BookingsPage'
import OrganizerDashboardPage from './pages/OrganizerDashboardPage'
import OrganizerBookingsPage from './pages/OrganizerBookingsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import ProfilePage from './pages/ProfilePage'
import { useLanguage } from './lib/i18n'

const tripColumns = 'id,organizer_id,slug,title,description,destination,category,starts_at,ends_at,price,currency,capacity,status,cover_image_url,cover_image_public_id'

function App() {
  const { t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const routeParts = location.pathname.split('/').filter(Boolean)
  const page = routeParts[0] === 'login' ? 'login'
    : routeParts[0] === 'bookings' ? 'bookings'
    : routeParts[0] === 'organizer' ? 'organizer'
      : routeParts[0] === 'profile' ? 'profile'
        : routeParts[0] === 'admin' ? 'admin'
          : routeParts[0] === 'trip-game' ? 'trip-game'
            : 'discover'
  const tripSlug = routeParts[0] === 'trips' ? decodeURIComponent(routeParts[1] ?? '') : ''
  const selectedGameRoomId = routeParts[0] === 'trip-game' ? routeParts[1] ?? null : null
  const nextPath = new URLSearchParams(location.search).get('next')
  const safeNextPath = nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/'
  const gameBackPage = new URLSearchParams(location.search).get('from') === 'organizer' ? 'organizer' : 'bookings'
  const setPage = useCallback((target: 'discover' | 'profile' | 'bookings' | 'organizer' | 'admin' | 'trip-game') => {
    const paths = { discover: '/', profile: '/profile', bookings: '/bookings', organizer: '/organizer', admin: '/admin', 'trip-game': '/trip-game' }
    navigate(paths[target])
  }, [navigate])
  const setSelectedTrip = (trip: Trip | null) => navigate(trip ? `/trips/${encodeURIComponent(trip.slug)}` : '/')
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authOpen, setAuthOpen] = useState(false)
  const [authTransition, setAuthTransition] = useState<'signin' | 'signup' | 'signout' | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const profileRequestId = useRef(0)
  const profileLoadedUserId = useRef<string | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [routeTrip, setRouteTrip] = useState<Trip | null>(null)
  const [loadingTripBySlug, setLoadingTripBySlug] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [filters, setFilters] = useState<Filters>({ destination: '', category: '', from: '', currency: 'IDR', maxPrice: '' })
  const selectedTrip = trips.find((trip) => trip.slug === tripSlug && new Date(trip.starts_at).getTime() > now)
    ?? (routeTrip?.slug === tripSlug && new Date(routeTrip.starts_at).getTime() > now ? routeTrip : null)

  useEffect(() => {
    const pageTitles: Record<string, string> = {
      discover: 'Adventure Trips in Indonesia',
      login: 'Sign In or Create an Account',
      bookings: 'My Bookings',
      organizer: 'Manage Trips',
      profile: 'Profile',
      admin: 'Admin Dashboard',
      'trip-game': 'Trip Story Room',
    }
    const isTripDetail = Boolean(tripSlug)
    const title = selectedTrip
      ? `Explore ${selectedTrip.title} | Camply`
      : `${pageTitles[page] ?? pageTitles.discover} | Camply`
    const description = selectedTrip
      ? `Discover ${selectedTrip.title}, an adventure trip in Indonesia with Camply. View dates and booking information.`.slice(0, 160)
      : 'Discover adventure trips across Indonesia with Camply. Explore nature, beaches, cities, local culture, and memorable getaways from local organizers.'
    const robots = page === 'discover' && (!isTripDetail || selectedTrip) ? 'index,follow' : 'noindex,nofollow'

    document.title = title
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.setAttribute('content', robots)
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute('content', title)
    document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.setAttribute('content', description)
  }, [page, selectedTrip, tripSlug])

  const [bookings, setBookings] = useState<Booking[]>([])
  const [managedTrips, setManagedTrips] = useState<Trip[]>([])
  const [managedBookings, setManagedBookings] = useState<Booking[]>([])
  const [adminTrips, setAdminTrips] = useState<Trip[]>([])
  const [adminBookings, setAdminBookings] = useState<Booking[]>([])
  const [tripGameRooms, setTripGameRooms] = useState<TripGameRoom[]>([])
  const [newGameTripId, setNewGameTripId] = useState('')
  const [newGamePrompt, setNewGamePrompt] = useState('')
  const [creatingGameRoom, setCreatingGameRoom] = useState(false)
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (location.pathname !== '/' || !location.hash) return
    const targetId = decodeURIComponent(location.hash.slice(1))
    const frameId = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: 'start' })
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [location.pathname, location.hash])

  useEffect(() => {
    if (!tripSlug || trips.some(trip => trip.slug === tripSlug)) return
    let active = true
    const loadTripFromPublicUrl = async () => {
      setLoadingTripBySlug(true)
      const { data, error: queryError } = await supabase.from('trips')
        .select(tripColumns)
        .eq('slug', tripSlug)
        .eq('status', 'published')
        .gt('starts_at', new Date().toISOString())
        .maybeSingle()
      if (!active) return
      if (queryError) setError('Detail trip gagal dimuat. Periksa koneksi dan akses trip publik.')
      else setRouteTrip((data as Trip | null) ?? null)
      setLoadingTripBySlug(false)
    }
    void Promise.resolve().then(loadTripFromPublicUrl)
    return () => { active = false }
  }, [tripSlug, trips, setError])

  useEffect(() => {
    if (!selectedTrip) return
    let active = true
    const checkAvailability = async () => {
      try {
        const { data, error: availabilityError } = await supabase.rpc('get_trip_seats_remaining', { p_trip_id: selectedTrip.id })
        if (!active) return
        if (availabilityError) setError('Sisa kursi belum dapat diperiksa. Booking tetap akan divalidasi saat dikirim.')
        else if (typeof data === 'number') {
          setRemainingSeats(data)
          setQuantity(current => Math.max(1, Math.min(current, Math.max(data, 1))))
        }
      } catch {
        if (active) setError('Sisa kursi belum dapat diperiksa. Booking tetap akan divalidasi saat dikirim.')
      }
    }
    void checkAvailability()
    return () => { active = false }
  }, [selectedTrip, setError])

  const loadTrips = useCallback(async () => {
    setLoadingTrips(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('trips')
      .select(tripColumns)
      .eq('status', 'published')
      .gt('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
    if (queryError) setError('Trip belum dapat dimuat. Periksa koneksi dan migrasi Supabase.')
    else { setError(''); setTrips((data ?? []) as Trip[]) }
    setLoadingTrips(false)
  }, [setError])

  useEffect(() => {
    let active = true
    const fetchTrips = async () => {
      const { data, error: queryError } = await supabase.from('trips').select(tripColumns).eq('status', 'published').gt('starts_at', new Date().toISOString()).order('starts_at', { ascending: true })
      if (!active) return
      if (queryError) setError('Trip belum dapat dimuat. Periksa koneksi dan migrasi Supabase.')
      else setTrips((data ?? []) as Trip[])
      setLoadingTrips(false)
    }
    void fetchTrips()
    return () => { active = false }
  }, [setError])

  const loadProfile = useCallback(async (currentUser: User | null) => {
    if (currentUser && profileLoadedUserId.current === currentUser.id) {
      setUser(currentUser)
      return
    }
    const requestId = ++profileRequestId.current
    setUser(currentUser)
    setProfile(null)
    setLoadingProfile(Boolean(currentUser))
    if (!currentUser) {
      profileLoadedUserId.current = null
      return
    }
    if (profileLoadedUserId.current !== currentUser.id) profileLoadedUserId.current = null
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id,display_name,bio')
      .eq('id', currentUser.id)
      .maybeSingle()
    if (requestId !== profileRequestId.current) return
    if (profileError) setError('Profil gagal dimuat.')
    else if (data) {
      const { data: role, error: roleError } = await supabase.rpc('current_app_role')
      if (requestId !== profileRequestId.current) return
      if (roleError || !['traveler', 'organizer', 'admin'].includes(String(role))) setError('Role akun gagal diperiksa.')
      else {
        profileLoadedUserId.current = currentUser.id
        setProfile({ ...data, role } as Profile)
      }
    }
    if (requestId === profileRequestId.current) setLoadingProfile(false)
  }, [setError])

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!alive) return
      if (sessionError) setError('Sesi gagal diperiksa. Silakan muat ulang halaman.')
      setSession(data.session)
      await loadProfile(data.session?.user ?? null)
      if (!alive) return
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION') return
      setSession(nextSession)
      void loadProfile(nextSession?.user ?? null)
      if (!nextSession) setPage('discover')
    })
    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [loadProfile, setError, setPage])

  const loadBookings = useCallback(async () => {
    if (!user) return
    const { data, error: bookingError } = await supabase
      .from('bookings')
      .select('id,traveler_id,trip_id,quantity,total_amount,currency,status,expires_at,created_at,traveler:profiles!bookings_traveler_id_fkey(display_name),trip:trips(title,destination,starts_at,ends_at),payment:payments(provider,status)')
      .eq('traveler_id', user.id)
      .order('created_at', { ascending: false })
    if (bookingError) setError('Booking gagal dimuat. Periksa apakah migrasi database sudah diterapkan.')
    else setBookings((data ?? []) as unknown as Booking[])
  }, [setError, user])

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
  }, [setError, user])

  const loadManagedBookings = useCallback(async () => {
    if (!user) return
    const { data, error: queryError } = await supabase
      .from('bookings')
      .select('id,traveler_id,trip_id,quantity,total_amount,currency,status,expires_at,created_at,traveler:profiles!bookings_traveler_id_fkey(display_name),trip:trips(title,destination,starts_at,ends_at),payment:payments(provider,status)')
      .order('created_at', { ascending: false })
    if (queryError) setError('Peserta trip gagal dimuat.')
    else setManagedBookings((data ?? []) as unknown as Booking[])
  }, [setError, user])

  const loadTripGameRooms = useCallback(async () => {
    if (!user) return
    const { data, error: roomsError } = await supabase.from('trip_game_rooms')
      .select('id,trip_id,prompt,status,trip:trips(title,destination)')
      .order('created_at', { ascending: false })
    if (roomsError) setError('Ruang cerita gagal dimuat. Pastikan migration P4 sudah diterapkan.')
    else setTripGameRooms((data ?? []) as unknown as TripGameRoom[])
  }, [setError, user])

  const loadAdminDashboard = useCallback(async () => {
    if (!user || profile?.role !== 'admin') return
    const [tripResult, bookingResult] = await Promise.all([
      supabase.from('trips').select(tripColumns).order('created_at', { ascending: false }),
      supabase.from('bookings')
        .select('id,traveler_id,trip_id,quantity,total_amount,currency,status,expires_at,created_at,traveler:profiles!bookings_traveler_id_fkey(display_name),trip:trips(title,destination,starts_at,ends_at),payment:payments(provider,status)')
        .order('created_at', { ascending: false }),
    ])
    if (tripResult.error || bookingResult.error) setError('Data operasional admin gagal dimuat.')
    else {
      setAdminTrips((tripResult.data ?? []) as Trip[])
      setAdminBookings((bookingResult.data ?? []) as unknown as Booking[])
    }
  }, [profile?.role, setError, user])

  // Load protected route data on direct URL visits and browser back/forward navigation too.
  useEffect(() => {
    if (!user) return
    if (page === 'bookings' && profile?.role === 'traveler') void Promise.resolve().then(() => Promise.all([loadBookings(), loadTripGameRooms()]))
    if (page === 'organizer' && ['organizer', 'admin'].includes(profile?.role ?? '')) {
      void Promise.resolve().then(() => Promise.all([loadManagedTrips(), loadManagedBookings(), loadTripGameRooms()]))
    }
    if (page === 'admin' && profile?.role === 'admin') void Promise.resolve().then(loadAdminDashboard)
  }, [page, user, profile?.role, loadBookings, loadTripGameRooms, loadManagedTrips, loadManagedBookings, loadAdminDashboard])

  useEffect(() => {
    if (!authReady) return
    if (page === 'login' && session && !loadingProfile && profile) {
      navigate(safeNextPath, { replace: true })
      return
    }
    if (tripSlug && !session) {
      navigate(`/login?next=${encodeURIComponent(`/trips/${encodeURIComponent(tripSlug)}`)}`, { replace: true })
      return
    }
    if (page === 'bookings' && session && !loadingProfile && profile?.role !== 'traveler') {
      navigate(profile?.role === 'organizer' ? '/organizer' : '/', { replace: true })
      return
    }
    if (!session && ['bookings', 'profile', 'trip-game'].includes(page)) {
      navigate('/', { replace: true })
      return
    }
    if (!loadingProfile && session && ((page === 'organizer' && !['organizer', 'admin'].includes(profile?.role ?? ''))
      || (page === 'admin' && profile?.role !== 'admin'))) {
      navigate('/', { replace: true })
    }
  }, [authReady, loadingProfile, page, profile, safeNextPath, session, tripSlug, navigate])

  const visibleTrips = useMemo(() => {
    const destination = filters.destination.trim().toLocaleLowerCase('id-ID')
    const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : null
    return trips.filter((trip) => {
      const matchesDestination = !destination || trip.destination.toLocaleLowerCase('id-ID').includes(destination)
      const matchesCategory = !filters.category || trip.category === filters.category
      const matchesDate = !filters.from || trip.starts_at.slice(0, 10) >= filters.from
      const matchesCurrency = !filters.currency || trip.currency === filters.currency
      const matchesPrice = maxPrice === null || (trip.currency === filters.currency && trip.price <= maxPrice)
      return new Date(trip.starts_at).getTime() > now
        && matchesDestination && matchesCategory && matchesDate && matchesCurrency && matchesPrice
    })
  }, [filters, now, trips])

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (authTransition) return
    setError('')
    setNotice('')
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const displayName = String(form.get('displayName') ?? '').trim()
    const signupRole = form.get('signupRole') === 'organizer' ? 'organizer' : 'traveler'
    if (password.length < 8) { setError('Kata sandi minimal 8 karakter.'); return }
    const mode = authMode
    setAuthTransition(mode)
    try {
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName, signup_role: signupRole } } })
        : await supabase.auth.signInWithPassword({ email, password })
      if (result.error) { setError(result.error.message); return }
      if (mode === 'signup' && !result.data.session) {
        setNotice('Akun dibuat. Periksa email untuk menyelesaikan konfirmasi sebelum masuk.')
      } else {
        setNotice(mode === 'signup' ? 'Akun berhasil dibuat.' : 'Berhasil masuk.')
        setAuthOpen(false)
        if (page === 'login') navigate(safeNextPath, { replace: true })
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Autentikasi gagal. Coba lagi.')
    } finally {
      setAuthTransition(null)
    }
  }

  async function handleSignOut() {
    if (authTransition) return
    setError('')
    setAuthTransition('signout')
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) setError('Gagal keluar. Coba lagi.')
      else { setNotice('Anda telah keluar.'); setProfile(null); setUser(null); setSelectedTrip(null); setPage('discover') }
    } catch {
      setError('Gagal keluar. Periksa koneksi lalu coba lagi.')
    } finally {
      setAuthTransition(null)
    }
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
    const category = String(form.get('category') ?? '')
    const description = String(form.get('description') ?? '').trim()
    const startsAt = new Date(String(form.get('starts_at') ?? ''))
    const endsAt = new Date(String(form.get('ends_at') ?? ''))
    const price = Number(form.get('price'))
    const currency = String(form.get('currency') ?? '').trim().toUpperCase()
    const capacity = Number(form.get('capacity'))
    const coverImageValue = form.get('cover_image')
    const coverImageFile = coverImageValue instanceof File && coverImageValue.size > 0 ? coverImageValue : null
    if (title.length < 3 || title.length > 140 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
      || destination.length < 2 || destination.length > 120 || description.length > 5000
      || !travelCategories.some(item => item.id === category)
      || !Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())
      || startsAt <= new Date() || endsAt <= startsAt || !Number.isFinite(price) || price < 0
      || !/^[A-Z]{3}$/.test(currency) || !Number.isInteger(capacity) || capacity < 1
      || !['draft', 'published'].includes(status ?? '')) {
      setError('Periksa kembali data trip. Tanggal mulai harus di masa depan dan tanggal selesai setelah tanggal mulai.')
      return
    }
    if (coverImageFile && (!['image/jpeg', 'image/png', 'image/webp'].includes(coverImageFile.type)
      || coverImageFile.size > 8 * 1024 * 1024)) {
      setError('Sampul harus berupa JPG, PNG, atau WebP dengan ukuran maksimal 8 MB.')
      return
    }
    setSavingTrip(true)
    setError('')
    setNotice('')
    let coverImageUrl = editingTrip?.cover_image_url ?? null
    let coverImagePublicId = editingTrip?.cover_image_public_id ?? null
    if (coverImageFile) {
      try {
        const uploadedCover = await uploadTripCover(coverImageFile)
        coverImageUrl = uploadedCover.secureUrl
        coverImagePublicId = uploadedCover.publicId
      } catch (uploadError) {
        setSavingTrip(false)
        setError(uploadError instanceof Error ? uploadError.message : 'Upload sampul gagal. Coba lagi.')
        return
      }
    }
    const tripValues = {
      slug,
      title,
      description: description || null,
      destination,
      category,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      price,
      currency,
      capacity,
      status,
      cover_image_url: coverImageUrl,
      cover_image_public_id: coverImagePublicId,
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
    if (profile?.role !== 'traveler') { setError('Booking hanya tersedia untuk akun traveler.'); return }
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
    if (profile?.role !== 'traveler') { setError('Pengelolaan booking hanya tersedia untuk akun traveler.'); return }
    const { error: cancelError } = await supabase.rpc('cancel_pending_booking', { p_booking_id: bookingId })
    if (cancelError) setError('Booking tidak dapat dibatalkan. Mungkin masa penahanan sudah berakhir.')
    else { setNotice('Booking pending dibatalkan dan kursinya dilepas.'); await loadBookings() }
  }

  async function completeMockPayment(bookingId: string) {
    if (profile?.role !== 'traveler') { setError('Pembayaran hanya tersedia untuk akun traveler.'); return }
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

  function prepareTripNavigation(trip: Trip) {
    if (!session) {
      navigate(`/login?next=${encodeURIComponent(`/trips/${encodeURIComponent(trip.slug)}`)}`)
      return false
    }
    setRemainingSeats(null)
    setQuantity(1)
    return true
  }

  async function openBookings() {
    if (profile?.role !== 'traveler') return
    setPage('bookings')
  }

  async function openOrganizer() {
    if (!['organizer', 'admin'].includes(profile?.role ?? '')) {
      setError('Akun traveler belum memiliki akses organizer.')
      return
    }
    setSelectedTrip(null)
    setPage('organizer')
  }

  function openTripGame(roomId: string, backPage: 'bookings' | 'organizer') {
    navigate(`/trip-game/${encodeURIComponent(roomId)}?from=${backPage}`)
  }

  async function createTripGameRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const prompt = newGamePrompt.trim()
    if (!user || !['organizer', 'admin'].includes(profile?.role ?? '')) {
      setError('Hanya organizer trip atau admin yang dapat membuka ruang cerita.')
      return
    }
    if (!newGameTripId || prompt.length < 10 || prompt.length > 500) {
      setError('Pilih trip terbit dan tulis prompt sepanjang 10–500 karakter.')
      return
    }
    setCreatingGameRoom(true)
    setError('')
    const { error: createError } = await supabase.from('trip_game_rooms').insert({
      trip_id: newGameTripId,
      prompt,
    })
    setCreatingGameRoom(false)
    if (createError) {
      setError(createError.code === '23505'
        ? 'Trip ini sudah memiliki ruang cerita.'
        : 'Ruang cerita tidak dapat dibuat. Pastikan trip sudah terbit dan Anda pemilik trip.')
      return
    }
    setNewGamePrompt('')
    setNewGameTripId('')
    setNotice('Ruang cerita dibuat. Peserta dengan booking confirmed dapat mengaksesnya.')
    await loadTripGameRooms()
  }

  async function openAdmin() {
    if (profile?.role !== 'admin') {
      setError('Halaman ini hanya tersedia untuk admin.')
      return
    }
    setSelectedTrip(null)
    setPage('admin')
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

  const header = <SiteHeader
    session={session}
    profile={profile}
    loadingProfile={loadingProfile}
    onOpenAuth={() => { setAuthOpen(true); setAuthMode('signin') }}
    onProfile={() => setPage('profile')}
    onBookings={() => { void openBookings() }}
    onManageTrips={() => void openOrganizer()}
    onAdmin={() => void openAdmin()}
    onHome={() => setPage('discover')}
    onSignOut={handleSignOut}
  />
  const feedback = <Feedback error={error} notice={notice} onDismiss={() => { setError(''); setNotice('') }} />
  const authBusy = authTransition !== null
  const authModal = authOpen ? <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} onSubmit={handleAuth} busy={authBusy} /> : null
  const protectedPagePending = ['bookings', 'organizer', 'admin', 'profile', 'trip-game'].includes(page)
    && (!authReady || Boolean(session && loadingProfile))
  const content = protectedPagePending
    ? <main className="content detail-page"><div className="empty-state">Memuat akun dan memeriksa akses…</div></main>
    : page === 'login'
      ? <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => navigate('/')} onSubmit={handleAuth} busy={authBusy} variant="page" />
      : selectedTrip
    ? <TripDetailsPage
        trip={selectedTrip}
        canBook={profile?.role === 'traveler'}
        bookingAccessLoading={!authReady || loadingProfile}
        remainingSeats={remainingSeats}
        quantity={quantity}
        busy={bookingBusy}
        onQuantityChange={setQuantity}
        onReserve={() => void reserveSeats()}
        onBack={() => setSelectedTrip(null)}
      />
    : tripSlug
      ? <main className="content detail-page"><div className="empty-state">{loadingTrips || loadingTripBySlug ? 'Memuat detail trip…' : error || 'Trip tidak ditemukan atau belum diterbitkan.'}<button className="text-button" onClick={() => setPage('discover')}>Kembali ke semua trip</button></div></main>
      : page === 'bookings' && session && profile?.role !== 'traveler'
        ? <main className="content profile-page"><div className="empty-state">Riwayat booking hanya tersedia untuk akun traveler.</div></main>
      : page === 'bookings' && session
        ? <BookingsPage
            bookings={bookings}
            rooms={tripGameRooms}
            onOpenGame={roomId => openTripGame(roomId, 'bookings')}
            onPay={setPaymentBooking}
            onCancel={bookingId => void cancelBooking(bookingId)}
            onExplore={() => setPage('discover')}
          />
        : page === 'organizer' && session && ['organizer', 'admin'].includes(profile?.role ?? '')
          ? routeParts[1] === 'bookings'
            ? <OrganizerBookingsPage bookings={managedBookings} />
            : <OrganizerDashboardPage
              now={now}
              trips={managedTrips}
              bookings={managedBookings}
              rooms={tripGameRooms}
              editingTrip={editingTrip}
              loadingTrips={loadingManagedTrips}
              savingTrip={savingTrip}
              newGameTripId={newGameTripId}
              newGamePrompt={newGamePrompt}
              creatingGameRoom={creatingGameRoom}
              onEditingTrip={setEditingTrip}
              onSaveTrip={saveTrip}
              onPublishTrip={tripId => void publishTrip(tripId)}
              onGameTripChange={setNewGameTripId}
              onPromptChange={setNewGamePrompt}
              onCreateRoom={createTripGameRoom}
              onOpenRoom={roomId => openTripGame(roomId, 'organizer')}
            />
          : page === 'admin' && session && profile?.role === 'admin'
            ? <AdminDashboardPage trips={adminTrips} bookings={adminBookings} onCancelTrip={tripId => void cancelAdminTrip(tripId)} />
            : page === 'profile' && session
              ? <ProfilePage profile={profile} loading={loadingProfile} onSubmit={saveProfile} />
              : page === 'trip-game' && session && selectedGameRoomId
                ? <TripGamePage roomId={selectedGameRoomId} role={profile?.role ?? 'traveler'} onBack={() => setPage(gameBackPage)} />
                : <LandingPage
                    trips={trips}
                    visibleTrips={visibleTrips}
                    filters={filters}
                    loading={loadingTrips}
                    error={error}
                    onFiltersChange={setFilters}
                    onRetry={() => void loadTrips()}
                    onSelectTrip={prepareTripNavigation}
                  />

  return <div className="app-shell">
    {header}
    {content}
    {!authReady && <div className="session-loading">Memeriksa sesi…</div>}
    {feedback}
    {authModal}
    {paymentBooking && <MockPaymentModal booking={paymentBooking} busy={payingBookingId === paymentBooking.id} onClose={() => setPaymentBooking(null)} onConfirm={() => void completeMockPayment(paymentBooking.id)} />}
    {authTransition && <div className="auth-transition-backdrop" role="status" aria-live="polite" aria-atomic="true" aria-busy="true">
      <div className="auth-transition-card">
        <span className="auth-transition-spinner" aria-hidden="true" />
        <span>{t(authTransition === 'signout' ? 'Sedang keluar…' : authTransition === 'signup' ? 'Sedang membuat akun…' : 'Sedang masuk ke akun…')}</span>
      </div>
    </div>}
  </div>
}

export default App
