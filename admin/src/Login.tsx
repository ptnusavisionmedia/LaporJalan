import { useState, type FormEvent } from 'react'
import { isConfigured, supabase } from './lib'
import { signInAdmin } from './auth'
import { Logo } from './Icons'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (!isConfigured) throw new Error('Koneksi Supabase belum dikonfigurasi.')
      await signInAdmin(supabase, username, password)
      // App.tsx mendengarkan perubahan sesi dan akan menampilkan dashboard.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="brandline">
          <Logo size={38} light /> LaporJalan
        </div>
        <div>
          <h1>Dari laporan warga sampai jalan diperbaiki.</h1>
          <p>Satu tempat untuk memverifikasi laporan, menentukan prioritas, dan membuktikan perbaikan.</p>
        </div>
        <div>
          <div className="lane" />
          <div className="kv">
            <span>
              <b>5 tahap</b>menunggu sampai selesai
            </span>
            <span>
              <b>4 tingkat</b>provinsi sampai kelurahan
            </span>
          </div>
        </div>
      </section>
      <div className="login-side">
      <form className="login-card" onSubmit={submit}>
        <h2>Masuk</h2>
        <p className="muted">Khusus admin dan petugas instansi.</p>

        {!isConfigured && (
          <div className="alert warn">Supabase belum dikonfigurasi. Isi admin/.env (lihat README) lalu restart.</div>
        )}

        <label htmlFor="username">Username atau email</label>
        <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin atau email akun Supabase" autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false} required />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <div className="alert error" role="alert">{error}</div>}

        <button className="btn primary block" disabled={busy || !isConfigured}>
          {busy ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
      </div>
    </div>
  )
}
