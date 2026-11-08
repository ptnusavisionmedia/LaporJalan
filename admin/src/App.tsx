import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, type Profile } from './lib'
import { Login } from './Login'
import { Dashboard } from './Dashboard'
import { Reports } from './Reports'
import { MapPage } from './MapPage'
import { Stats } from './Stats'
import { Users } from './Users'
import { Icon, Logo } from './Icons'

type IconName = Parameters<typeof Icon>[0]['name']

type Page = 'dashboard' | 'map' | 'reports' | 'stats' | 'users'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)
  const [page, setPage] = useState<Page>('dashboard')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Pastikan yang masuk admin atau instansi (dicek ulang tiap sesi berubah).
  useEffect(() => {
    if (!session) {
      setProfile(null)
      setReady(true)
      return
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        const p = data as Profile | null
        setProfile(p && (p.role === 'admin' || p.role === 'instansi') ? p : null)
        setReady(true)
      })
  }, [session])

  if (!ready) return <p className="muted pad">Memuat...</p>
  if (!session || !profile) return <Login />

  const isAdmin = profile.role === 'admin'

  const open = (id: string) => {
    setOpenId(id)
    setPage('reports')
  }

  const nav: [Page, string, IconName, string][] = [
    ['dashboard', 'Ringkasan', 'dashboard', 'Ringkasan'],
    ['map', 'Peta', 'map', 'Peta'],
    ['reports', 'Laporan', 'list', 'Laporan'],
    ['stats', 'Statistik wilayah', 'chart', 'Statistik'],
  ]
  if (isAdmin) nav.push(['users', 'Pengguna & instansi', 'users', 'Pengguna'])

  const scopeText =
    profile.role === 'admin'
      ? 'Administrator'
      : `${profile.agency_name || profile.username} · ${
          profile.scope_level === 'nasional' ? 'Nasional' : `${profile.scope_level} ${profile.scope_value ?? ''}`
        }`

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <Logo size={34} light /> LaporJalan
        </div>
        <button className="topbar-out" onClick={() => supabase.auth.signOut()} aria-label="Keluar">
          <Icon name="logout" />
        </button>
      </header>
      <aside className="sidebar">
        <div className="brand">
          <Logo size={40} light /> LaporJalan
        </div>
        <div className="who">{scopeText}</div>
        {nav.map(([key, label, icon, short]) => (
          <button
            key={key}
            className={`nav ${page === key ? 'active' : ''}`}
            onClick={() => {
              setOpenId(null)
              setPage(key)
            }}
          >
            <Icon name={icon} />
            <span className="lbl">{label}</span>
            <span className="lbl-s">{short}</span>
          </button>
        ))}
        <div className="grow" />
        <button className="nav nav-out" onClick={() => supabase.auth.signOut()}>
          <Icon name="logout" />
          Keluar
        </button>
      </aside>
      <main className="content">
        {page === 'dashboard' && <Dashboard profile={profile} onOpen={open} />}
        {page === 'map' && <MapPage profile={profile} onOpen={open} />}
        {page === 'reports' && (
          <Reports key={openId ?? 'all'} profile={profile} openId={openId} onClose={() => setOpenId(null)} />
        )}
        {page === 'stats' && <Stats profile={profile} />}
        {page === 'users' && isAdmin && <Users me={profile} />}
      </main>
    </div>
  )
}
