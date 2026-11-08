import { useState, type FormEvent } from 'react'
import { isConfigured, supabase } from './lib'
import { signInAdmin } from './auth'
import { Logo } from './Icons'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

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
        <div className="pw">
          <input
            id="password"
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
          <button
            type="button"
            className="pw-toggle"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
            aria-pressed={show}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {show && <path d="M3 3l18 18" />}
            </svg>
          </button>
        </div>

        {error && <div className="alert error" role="alert">{error}</div>}

        <button className="btn primary block" disabled={busy || !isConfigured}>
          {busy ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
      </div>
    </div>
  )
}
