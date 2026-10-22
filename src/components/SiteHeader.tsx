import type { Session } from '@supabase/supabase-js'
import { Link } from 'react-router-dom'
import type { Profile } from '../types'

type Props = {
  session: Session | null
  profile: Profile | null
  loadingProfile: boolean
  onOpenAuth: () => void
  onProfile: () => void
  onBookings: () => void
  onManageTrips: () => void
  onAdmin: () => void
  onHome: () => void
  onSignOut: () => void
}

export default function SiteHeader({ session, profile, loadingProfile, onOpenAuth, onProfile, onBookings, onManageTrips, onAdmin, onHome, onSignOut }: Props) {
  return (
    <header className="site-header">
      <button className="brand" onClick={onHome} aria-label="Camply beranda">
        <span className="brand-mark">c</span><span>camply<span className="brand-period">.</span></span>
      </button>
      <nav><Link to="/#explore" onClick={onHome}>Cari trip</Link><a href="/#about">Tentang</a></nav>
      <div className="header-actions">
        {session ? <>
          {loadingProfile ? <span className="role-label">Memuat akun…</span> : profile && <span className={`role-label role-${profile.role}`}>{profile.role}</span>}
          {['organizer', 'admin'].includes(profile?.role ?? '') && <button className="profile-link" onClick={onManageTrips}>Kelola trip</button>}
          {profile?.role === 'admin' && <button className="profile-link" onClick={onAdmin}>Admin</button>}
          {profile?.role === 'traveler' && <button className="profile-link" onClick={onBookings}>Booking</button>}
          <button className="profile-link" onClick={onProfile}>{profile?.display_name ?? 'Akun'}</button>
          <button className="outline-button" onClick={onSignOut}>Keluar</button>
        </> : <>
          <button className="text-button signin-link" onClick={onOpenAuth}>Masuk</button>
          <button className="outline-button" onClick={onOpenAuth}>Mulai eksplorasi <span>↗</span></button>
        </>}
      </div>
    </header>
  )
}
