import type { Session } from '@supabase/supabase-js'
import { Link } from 'react-router-dom'
import type { Profile } from '../types'
import { useLanguage } from '../lib/i18n'

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
  const { language, setLanguage, t } = useLanguage()
  return (
    <header className="site-header">
      <button className="brand" onClick={onHome} aria-label={t('Camply beranda')}>
        <span className="brand-mark">c</span><span>camply<span className="brand-period">.</span></span>
      </button>
      <nav><Link to="/#explore" onClick={onHome}>{t('Cari trip')}</Link><a href="/#about">{t('Tentang')}</a></nav>
      <div className="header-actions">
        <div className="language-switch" role="group" aria-label={t('Pilih bahasa')}>
          <button type="button" aria-pressed={language === 'id'} onClick={() => setLanguage('id')}>ID</button>
          <span aria-hidden="true">/</span>
          <button type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
        </div>
        {session ? <>
          {loadingProfile ? <span className="role-label">{t('Memuat akun…')}</span> : profile && <span className={`role-label role-${profile.role}`}>{t(profile.role)}</span>}
          {['organizer', 'admin'].includes(profile?.role ?? '') && <button className="profile-link" onClick={onManageTrips}>{t('Kelola trip')}</button>}
          {profile?.role === 'admin' && <button className="profile-link" onClick={onAdmin}>{t('Admin')}</button>}
          {profile?.role === 'traveler' && <button className="profile-link" onClick={onBookings}>{t('Booking')}</button>}
          <button className="profile-link" onClick={onProfile}>{profile?.display_name ?? t('Akun')}</button>
          <button className="outline-button" onClick={onSignOut}>{t('Keluar')}</button>
        </> : <>
          <button className="text-button signin-link" onClick={onOpenAuth}>{t('Masuk')}</button>
          <button className="outline-button" onClick={onOpenAuth}>{t('Mulai eksplorasi')} <span>↗</span></button>
        </>}
      </div>
    </header>
  )
}
