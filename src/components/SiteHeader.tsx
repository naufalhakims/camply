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
      <nav className="main-nav" aria-label={t('Navigasi utama')}>
        <Link className="nav-link" to="/#explore" onClick={onHome}>{t('Cari trip')}</Link>
        <Link className="nav-link" to="/#about" onClick={onHome}>{t('Tentang')}</Link>
        {profile?.role === 'traveler' && <Link className="nav-link" to="/bookings" onClick={onBookings}>{t('Booking')}</Link>}
        {['organizer', 'admin'].includes(profile?.role ?? '') && <Link className="nav-link" to="/organizer" onClick={onManageTrips}>{t('Kelola trip')}</Link>}
        {profile?.role === 'admin' && <Link className="nav-link" to="/admin" onClick={onAdmin}>{t('Admin')}</Link>}
      </nav>
      <div className="header-actions">
        <div className="language-switch" role="group" aria-label={t('Pilih bahasa')}>
          <button type="button" aria-pressed={language === 'id'} onClick={() => setLanguage('id')}>ID</button>
          <span aria-hidden="true">/</span>
          <button type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
        </div>
        {session ? <details className="account-menu">
          <summary className="account-trigger" aria-label={t('Menu akun')}>
            <span className="account-avatar" aria-hidden="true">{profile?.display_name?.trim().charAt(0).toLocaleUpperCase() || '•'}</span>
            <span className="account-name">{loadingProfile ? t('Memuat akun…') : profile?.display_name ?? t('Akun')}</span>
            <span className="account-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="account-popover">
            <div className="account-summary">
              <strong>{profile?.display_name ?? t('Akun')}</strong>
              <span className={`role-label role-${profile?.role ?? 'traveler'}`}>{t(profile?.role ?? 'traveler')}</span>
            </div>
            <button className="account-menu-item" onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); onProfile() }}>{t('Profil')}</button>
            <button className="account-menu-item account-signout" onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); onSignOut() }}>{t('Keluar')}</button>
          </div>
        </details> : <button className="primary-button nav-cta" onClick={onOpenAuth}>{t('Masuk')} <span aria-hidden="true">↗</span></button>}
      </div>
    </header>
  )
}
