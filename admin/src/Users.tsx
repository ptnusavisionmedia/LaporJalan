import { useCallback, useEffect, useState } from 'react'
import { Select } from './Select'
import { fmtDate, SCOPE_LABEL, supabase, type Profile, type ScopeLevel } from './lib'

export function Users({ me }: { me: Profile }) {
  const [users, setUsers] = useState<Profile[] | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [editing, setEditing] = useState<Profile | null>(null)

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('reports').select('user_id'),
    ])
    const c: Record<string, number> = {}
    for (const row of r.data ?? []) c[row.user_id] = (c[row.user_id] ?? 0) + 1
    setCounts(c)
    setUsers((p.data ?? []) as Profile[])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <h2>Pengguna & Instansi</h2>
      <p className="muted small">
        Instansi hanya dapat melihat dan mengelola laporan di wilayah kewenangannya. Ubah role warga menjadi
        “instansi” lalu tentukan wilayahnya.
      </p>
      <div className="panel table-wrap">
        <table className="stack">
          <thead>
            <tr>
              <th>Username</th>
              <th>Peran</th>
              <th>Instansi / wilayah</th>
              <th>Laporan</th>
              <th>Terdaftar</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!users && (
              <tr>
                <td colSpan={6} className="muted">
                  Memuat...
                </td>
              </tr>
            )}
            {users?.map((u) => (
              <tr key={u.id}>
                <td className="c-title">
                  <b>@{u.username}</b>
                </td>
                <td data-label="Peran">
                  <span className={`badge ${u.role === 'admin' ? 's-diproses' : u.role === 'instansi' ? 's-diverifikasi' : 's-menunggu'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="small" data-label="Instansi / wilayah">
                  {u.role === 'instansi'
                    ? `${u.agency_name || '-'} · ${u.scope_level === 'nasional' ? 'Nasional' : `${u.scope_level}: ${u.scope_value ?? '-'}`}`
                    : '-'}
                </td>
                <td data-label="Laporan">{counts[u.id] ?? 0}</td>
                <td className="small" data-label="Terdaftar">{fmtDate(u.created_at)}</td>
                <td className="c-action">
                  {u.id !== me.id && (
                    <button className="btn small-btn" onClick={() => setEditing(u)}>
                      Atur
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <RoleDialog
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </>
  )
}

function RoleDialog({ user, onClose, onSaved }: { user: Profile; onClose: () => void; onSaved: () => void }) {
  const [role, setRole] = useState<Profile['role']>(user.role)
  const [agency, setAgency] = useState(user.agency_name ?? '')
  const [level, setLevel] = useState<ScopeLevel>(user.scope_level)
  const [value, setValue] = useState(user.scope_value ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (role === 'instansi' && level !== 'nasional' && !value.trim()) {
      return setError('Isi nama wilayah kewenangan (contoh: Bandung).')
    }
    setBusy(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        role,
        agency_name: role === 'instansi' ? agency.trim() || null : null,
        scope_level: role === 'instansi' ? level : 'nasional',
        scope_value: role === 'instansi' && level !== 'nasional' ? value.trim() : null,
      })
      .eq('id', user.id)
    setBusy(false)
    if (error) return setError(error.message)
    onSaved()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h3>Atur akun @{user.username}</h3>
          <button className="btn" onClick={onClose}>
            Tutup
          </button>
        </div>

        <label>Peran</label>
        <Select label="Peran" value={role} onChange={setRole} options={[{ value: 'user', label: 'Warga (user)' }, { value: 'instansi', label: 'Instansi' }, { value: 'admin', label: 'Administrator' }]} />

        {role === 'instansi' && (
          <>
            <label>Nama instansi</label>
            <input value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="Dinas PU Kota Bandung" />
            <label>Tingkat wilayah kewenangan</label>
            <Select label="Tingkat wilayah" value={level} onChange={setLevel} options={(Object.keys(SCOPE_LABEL) as ScopeLevel[]).map((k) => ({ value: k, label: SCOPE_LABEL[k] }))} />
            {level !== 'nasional' && (
              <>
                <label>Nama wilayah (harus sama dengan data laporan)</label>
                <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="contoh: Bandung" />
              </>
            )}
          </>
        )}

        {error && <div className="alert error">{error}</div>}
        <div className="actions">
          <button className="btn primary" onClick={save} disabled={busy}>
            Simpan
          </button>
        </div>
      </aside>
    </div>
  )
}
