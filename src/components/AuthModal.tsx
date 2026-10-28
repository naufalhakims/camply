import type { FormEvent } from 'react'
import { useLanguage } from '../lib/i18n'

type Props = {
  mode: 'signin' | 'signup'
  setMode: (mode: 'signin' | 'signup') => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  busy?: boolean
  variant?: 'modal' | 'page'
}

export default function AuthModal({ mode, setMode, onClose, onSubmit, busy = false, variant = 'modal' }: Props) {
  const { t } = useLanguage()
  return (
    <div className={variant === 'page' ? 'auth-page content' : 'modal-backdrop'} role={variant === 'page' ? undefined : 'presentation'} onMouseDown={event => { if (variant === 'modal' && event.target === event.currentTarget) onClose() }}>
      <section className="auth-modal" role="dialog" aria-modal={variant === 'modal'} aria-labelledby="auth-title">
        <button className="modal-close" aria-label={t(variant === 'page' ? 'Kembali ke beranda' : 'Tutup')} onClick={onClose}>{variant === 'page' ? '←' : '×'}</button>
        <span className="eyebrow">{t('SELAMAT DATANG DI CAMPLY')}</span>
        <h2 id="auth-title">{t(mode === 'signin' ? 'Senang bertemu lagi.' : 'Perjalananmu dimulai di sini.')}</h2>
        <p>{t(mode === 'signin' ? 'Masuk untuk melihat akun dan booking-mu.' : 'Pilih cara kamu berpartisipasi di Camply.')}</p>
        <form onSubmit={onSubmit} aria-busy={busy}>
          {mode === 'signup' && <>
            <label>{t('Nama tampilan')}<input name="displayName" autoComplete="name" required maxLength={80} /></label>
            <label>{t('DAFTAR SEBAGAI')}<select name="signupRole" defaultValue="traveler"><option value="traveler">{t('Traveler — cari dan booking trip')}</option><option value="organizer">{t('Organizer — buat dan kelola trip')}</option></select></label>
            <small className="signup-role-note">{t('Pilihan ini berlaku saat akun dibuat. Role Admin hanya dapat diberikan oleh pemilik proyek.')}</small>
          </>}
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>{t('Kata sandi')}<input name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required /></label>
          <button className="primary-button" type="submit" disabled={busy}>{t(busy ? 'Sedang memproses…' : mode === 'signin' ? 'Masuk' : 'Buat akun')}</button>
        </form>
        <p className="auth-switch">{t(mode === 'signin' ? 'Belum punya akun?' : 'Sudah punya akun?')} <button className="text-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{t(mode === 'signin' ? 'Daftar' : 'Masuk')}</button></p>
      </section>
    </div>
  )
}
