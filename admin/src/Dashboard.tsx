import { useEffect, useState } from 'react'
import { ReportImage } from './ReportImage'
import {
  CATEGORY_LABEL,
  fetchReports,
  fmtDate,
  priorityLevel,
  STATUSES,
  STATUS_LABEL,
  type Profile,
  type Report,
} from './lib'

export function Dashboard({ profile, onOpen }: { profile: Profile; onOpen: (id: string) => void }) {
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReports(profile)
      .then(setReports)
      .catch((e) => setError(e.message))
  }, [profile])

  if (error) return <div className="alert error">{error}</div>
  if (!reports) return <p className="muted">Memuat...</p>

  const counts = Object.fromEntries(STATUSES.map((s) => [s, reports.filter((r) => r.status === s).length]))
  const open = reports.filter((r) => r.status !== 'selesai' && r.status !== 'ditolak')
  const urgent = open.slice(0, 5) // sudah terurut prioritas dari fetchReports
  const recent = [...reports].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)
  const access = open.filter((r) => r.category.match(/trotoar_terhalang|jalur_pemandu|akses_kursi/)).length
  const conflicts = open.filter((r) => r.validations.some((v) => !v.still_damaged) && r.status !== 'menunggu').length

  const Row = ({ r, showPriority }: { r: Report; showPriority?: boolean }) => (
    <div className="row-item" onClick={() => onOpen(r.id)}>
      <ReportImage className="thumb" src={r.image_url} alt={r.title} />
      <div className="grow">
        <b>{r.title}</b>
        <div className="muted small">
          {CATEGORY_LABEL[r.category]} · @{r.profiles?.username} · {fmtDate(r.created_at)}
        </div>
      </div>
      {showPriority && (
        <span className={`badge ${priorityLevel(r.priority_score).cls}`}>
          {priorityLevel(r.priority_score).label} · {r.priority_score}
        </span>
      )}
      <span className={`badge s-${r.status}`}>{STATUS_LABEL[r.status]}</span>
    </div>
  )

  return (
    <>
      <h2>Ringkasan</h2>
      <div className="stats">
        <div className="stat">
          <span className="muted">Total laporan</span>
          <b>{reports.length}</b>
        </div>
        {STATUSES.map((s) => (
          <div className={`stat s-${s}`} key={s}>
            <span className="muted">{STATUS_LABEL[s]}</span>
            <b>{counts[s]}</b>
          </div>
        ))}
        <div className="stat">
          <span className="muted">Aksesibilitas aktif</span>
          <b>{access}</b>
        </div>
      </div>

      {conflicts > 0 && (
        <div className="alert warn">
          {conflicts} laporan yang sedang ditangani dikonfirmasi warga “sudah diperbaiki” — periksa dan tutup bila benar.
        </div>
      )}

      <h3>Perlu ditangani lebih dulu (prioritas otomatis)</h3>
      <div className="panel">
        {urgent.length === 0 && <p className="muted pad">Tidak ada laporan aktif.</p>}
        {urgent.map((r) => (
          <Row key={r.id} r={r} showPriority />
        ))}
      </div>

      <h3>Laporan terbaru</h3>
      <div className="panel">
        {recent.length === 0 && <p className="muted pad">Belum ada laporan masuk.</p>}
        {recent.map((r) => (
          <Row key={r.id} r={r} />
        ))}
      </div>
    </>
  )
}
