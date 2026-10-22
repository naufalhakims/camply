import type { FormEvent } from 'react'
import type { Profile } from '../types'

export default function ProfilePage({ profile, loading, onSubmit }: { profile: Profile | null; loading: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <main className="content profile-page">
    <span className="eyebrow">AKUN ANDA · <span className={`role-label role-${profile?.role ?? 'traveler'}`}>{profile?.role ?? 'traveler'}</span></span>
    <h1>Profil {profile?.role === 'organizer' ? 'organizer' : profile?.role === 'admin' ? 'admin' : 'traveler'}</h1>
    {loading ? <p>Memuat profil…</p> : profile ? <form className="panel profile-form" onSubmit={onSubmit}>
      <label>Nama tampilan<input name="display_name" maxLength={80} defaultValue={profile.display_name} required /></label>
      <label>Bio<textarea name="bio" maxLength={500} rows={5} defaultValue={profile.bio ?? ''} placeholder="Ceritakan sedikit tentang diri Anda" /></label>
      <button className="primary-button" type="submit">Simpan perubahan</button>
    </form> : <p className="empty-state">Profil belum tersedia. Coba keluar lalu masuk kembali.</p>}
  </main>
}
