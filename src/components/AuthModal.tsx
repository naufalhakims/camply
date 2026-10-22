import type { FormEvent } from 'react'

type Props = {
  mode: 'signin' | 'signup'
  setMode: (mode: 'signin' | 'signup') => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  variant?: 'modal' | 'page'
}

export default function AuthModal({ mode, setMode, onClose, onSubmit, variant = 'modal' }: Props) {
  return (
    <div className={variant === 'page' ? 'auth-page content' : 'modal-backdrop'} role={variant === 'page' ? undefined : 'presentation'} onMouseDown={event => { if (variant === 'modal' && event.target === event.currentTarget) onClose() }}>
      <section className="auth-modal" role="dialog" aria-modal={variant === 'modal'} aria-labelledby="auth-title">
        <button className="modal-close" aria-label={variant === 'page' ? 'Kembali ke beranda' : 'Tutup'} onClick={onClose}>{variant === 'page' ? '←' : '×'}</button>
        <span className="eyebrow">SELAMAT DATANG DI CAMPLY</span>
        <h2 id="auth-title">{mode === 'signin' ? 'Senang bertemu lagi.' : 'Perjalananmu dimulai di sini.'}</h2>
        <p>{mode === 'signin' ? 'Masuk untuk melihat akun dan booking-mu.' : 'Pilih cara kamu berpartisipasi di Camply.'}</p>
        <form onSubmit={onSubmit}>
          {mode === 'signup' && <>
            <label>Nama tampilan<input name="displayName" autoComplete="name" required maxLength={80} /></label>
            <label>DAFTAR SEBAGAI<select name="signupRole" defaultValue="traveler"><option value="traveler">Traveler — cari dan booking trip</option><option value="organizer">Organizer — buat dan kelola trip</option></select></label>
            <small className="signup-role-note">Pilihan ini berlaku saat akun dibuat. Role Admin hanya dapat diberikan oleh pemilik proyek.</small>
          </>}
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Kata sandi<input name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required /></label>
          <button className="primary-button" type="submit">{mode === 'signin' ? 'Masuk' : 'Buat akun'}</button>
        </form>
        <p className="auth-switch">{mode === 'signin' ? 'Belum punya akun?' : 'Sudah punya akun?'} <button className="text-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Daftar' : 'Masuk'}</button></p>
      </section>
    </div>
  )
}
