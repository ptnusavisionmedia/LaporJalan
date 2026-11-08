import { useEffect, useMemo, useState } from 'react'
import { fetchReports, type Profile, type Report } from './lib'

type Level = 'province' | 'city' | 'district' | 'village'
const LEVELS: [Level, string][] = [
  ['province', 'Provinsi'],
  ['city', 'Kabupaten/Kota'],
  ['district', 'Kecamatan'],
  ['village', 'Desa/Kelurahan'],
]

interface Row {
  name: string
  total: number
  pending: number
  progress: number
  done: number
}

function aggregate(reports: Report[], level: Level): Row[] {
  const map = new Map<string, Row>()
  for (const r of reports) {
    if (r.status === 'ditolak') continue
    const name = r[level].trim() || '(wilayah belum diisi)'
    const row = map.get(name) ?? { name, total: 0, pending: 0, progress: 0, done: 0 }
    row.total++
    if (r.status === 'menunggu' || r.status === 'diverifikasi') row.pending++
    else if (r.status === 'diproses') row.progress++
    else row.done++
    map.set(name, row)
  }
  return [...map.values()].sort((a, b) => b.pending - a.pending || b.total - a.total)
}

export function Stats({ profile }: { profile: Profile }) {
  const [reports, setReports] = useState<Report[] | null>(null)
  const [level, setLevel] = useState<Level>('city')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReports(profile)
      .then(setReports)
      .catch((e) => setError(e.message))
  }, [profile])

  const rows = useMemo(() => (reports ? aggregate(reports, level) : []), [reports, level])

  const exportCsv = () => {
    const head = 'Wilayah,Total,Belum ditangani,Diproses,Selesai,Progres (%)'
    const body = rows.map((r) =>
      [`"${r.name.replace(/"/g, '""')}"`, r.total, r.pending, r.progress, r.done, Math.round((r.done / r.total) * 100)].join(','),
    )
    const blob = new Blob([[head, ...body].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `statistik-${level}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (error) return <div className="alert error">{error}</div>
  if (!reports) return <p className="muted">Memuat...</p>

  return (
    <>
      <h2>Statistik Infrastruktur Daerah</h2>
      <div className="toolbar">
        {LEVELS.map(([k, label]) => (
          <button key={k} className={`btn ${level === k ? 'primary' : ''}`} onClick={() => setLevel(k)}>
            {label}
          </button>
        ))}
        <div className="grow" />
        <button className="btn" onClick={exportCsv}>
          Ekspor CSV
        </button>
      </div>
      <div className="panel table-wrap">
        <table className="stack">
          <thead>
            <tr>
              <th>Wilayah</th>
              <th>Total</th>
              <th>Belum ditangani</th>
              <th>Diproses</th>
              <th>Selesai</th>
              <th style={{ minWidth: 200 }}>Progres perbaikan</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Belum ada data.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const pct = Math.round((r.done / r.total) * 100)
              return (
                <tr key={r.name}>
                  <td className="c-title">
                    <b>{r.name}</b>
                  </td>
                  <td data-label="Total">{r.total}</td>
                  <td data-label="Belum ditangani">{r.pending}</td>
                  <td data-label="Diproses">{r.progress}</td>
                  <td data-label="Selesai">{r.done}</td>
                  <td data-label="Progres">
                    <div className="bar">
                      <div className="bar-done" style={{ flex: r.done }} />
                      <div className="bar-prog" style={{ flex: r.progress }} />
                      <div className="bar-pend" style={{ flex: r.pending }} />
                    </div>
                    <span className="small muted">{pct}% selesai</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Wilayah diambil dari data lokasi laporan. Laporan ditolak tidak dihitung. Bila wilayah salah, koreksi di detail
        laporan.
      </p>
    </>
  )
}
