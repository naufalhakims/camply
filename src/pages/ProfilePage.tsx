import type { FormEvent } from 'react'
import type { Profile } from '../types'
import { useLanguage } from '../lib/i18n'

export default function ProfilePage({ profile, loading, onSubmit }: { profile: Profile | null; loading: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const { t } = useLanguage()
  const role = profile?.role ?? 'traveler'
  return <main className="content profile-page">
    <span className="eyebrow">{t('AKUN ANDA')} · <span className={`role-label role-${role}`}>{t(role)}</span></span>
    <h1>{t('Profil')} {t(role)}</h1>
    {loading ? <p>{t('Memuat profil…')}</p> : profile ? <form className="panel profile-form" onSubmit={onSubmit}>
      <label>{t('Nama tampilan')}<input name="display_name" maxLength={80} defaultValue={profile.display_name} required /></label>
      <label>{t('Bio')}<textarea name="bio" maxLength={500} rows={5} defaultValue={profile.bio ?? ''} placeholder={t('Ceritakan sedikit tentang diri Anda')} /></label>
      <button className="primary-button" type="submit">{t('Simpan perubahan')}</button>
    </form> : <p className="empty-state">{t('Profil belum tersedia. Coba keluar lalu masuk kembali.')}</p>}
  </main>
}
