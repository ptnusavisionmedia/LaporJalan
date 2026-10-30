import { useCallback, useEffect, useState } from 'react'
import { ReportImage } from './ReportImage'
import { Select } from './Select'
import {
  CATEGORIES,
  CATEGORY_LABEL,
  fetchReports,
  fmtDate,
  priorityLevel,
  SEVERITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  supabase,
  type Category,
  type Comment,
  type Profile,
  type Report,
  type ReportUpdate,
  type Status,
} from './lib'

export function Reports({
  profile,
  openId,
  onClose,
}: {
  profile: Profile
  openId: string | null
  onClose: () => void
}) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Status | 'semua' | 'aktif'>('aktif')
  const [category, setCategory] = useState<Category | 'semua'>('semua')
  const [sort, setSort] = useState<'prioritas' | 'terbaru'>('prioritas')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(openId)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setReports(await fetchReports(profile))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat laporan.')
    }
    setLoading(false)
  }, [profile])

  useEffect(() => {
    load()
  }, [load])

  const q = search.trim().toLowerCase()
  const shown = reports
    .filter(
      (r) =>
        (filter === 'semua' ||
          (filter === 'aktif' ? r.status !== 'selesai' && r.status !== 'ditolak' : r.status === filter)) &&
        (category === 'semua' || r.category === category) &&
        (!q ||
          r.title.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          [r.province, r.city, r.district, r.village].some((x) => x.toLowerCase().includes(q)) ||
          (r.profiles?.username ?? '').includes(q)),
    )
    .sort((a, b) =>
      sort === 'prioritas'
        ? b.priority_score - a.priority_score || b.created_at.localeCompare(a.created_at)
        : b.created_at.localeCompare(a.created_at),
    )
  const selected = reports.find((r) => r.id === selectedId) ?? null

  return (
    <>
      <h2>Kelola Laporan</h2>
      <div className="toolbar">
        <input placeholder="Cari judul, alamat, wilayah, atau username..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select label="Filter status" value={filter} onChange={setFilter} options={[{ value: 'aktif', label: 'Belum selesai' }, { value: 'semua', label: 'Semua status' }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]} />
        <Select label="Filter jenis" value={category} onChange={setCategory} options={[{ value: 'semua', label: 'Semua jenis' }, ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))]} />
        <Select label="Urutan" value={sort} onChange={setSort} options={[{ value: 'prioritas', label: 'Urut: prioritas' }, { value: 'terbaru', label: 'Urut: terbaru' }]} />
        <button className="btn" onClick={load}>
          Muat ulang
        </button>
      </div>
      {error && <div className="alert error">{error}</div>}

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Foto</th>
              <th>Judul / jenis</th>
              <th>Pelapor</th>
              <th>Wilayah</th>
              <th>Prioritas</th>
              <th>Warga</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="muted">
                  Memuat...
                </td>
              </tr>
            )}
            {!loading && shown.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  Tidak ada laporan.
                </td>
              </tr>
            )}
            {shown.map((r) => {
              const pr = priorityLevel(r.priority_score)
              const still = r.validations.filter((v) => v.still_damaged).length
              const fixed = r.validations.length - still
              return (
                <tr key={r.id} className="click" onClick={() => setSelectedId(r.id)}>
                  <td>
                    <ReportImage className="thumb" src={r.image_url} alt={r.title} />
                  </td>
                  <td>
                    <b>{r.title}</b>
                    <div className="small muted">
                      {CATEGORY_LABEL[r.category]} · {SEVERITY_LABEL[r.severity]} · {fmtDate(r.created_at)}
                    </div>
                  </td>
                  <td>@{r.profiles?.username}</td>
                  <td className="small">{[r.village, r.district, r.city].filter(Boolean).join(', ') || r.address || '-'}</td>
                  <td>
                    <span className={`badge ${pr.cls}`}>
                      {pr.label} · {r.priority_score}
                    </span>
                  </td>
                  <td className="small">
                    {r.likes[0]?.count ?? 0} suka · {r.comments[0]?.count ?? 0} komentar
                    <br />
                    {still} masih rusak · {fixed} sudah diperbaiki
                  </td>
                  <td>
                    <span className={`badge s-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <Detail
          key={selected.id}
          profile={profile}
          report={selected}
          onClose={() => {
            setSelectedId(null)
            onClose()
          }}
          onChanged={load}
        />
      )}
    </>
  )
}

function Detail({
  profile,
  report,
  onClose,
  onChanged,
}: {
  profile: Profile
  report: Report
  onClose: () => void
  onChanged: () => void
}) {
  const [status, setStatus] = useState<Status>(report.status)
  const [note, setNote] = useState(report.admin_note ?? '')
  const [category, setCategory] = useState<Category>(report.category)
  const [severity, setSeverity] = useState<number>(report.severity)
  const [traffic, setTraffic] = useState(report.traffic)
  const [region, setRegion] = useState({
    province: report.province,
    city: report.city,
    district: report.district,
    village: report.village,
  })
  const [comments, setComments] = useState<Comment[]>([])
  const [updates, setUpdates] = useState<ReportUpdate[]>([])
  const [updNote, setUpdNote] = useState('')
  const [updFile, setUpdFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const loadExtra = useCallback(async () => {
    const [c, u] = await Promise.all([
      supabase
        .from('comments')
        .select('id, body, created_at, profiles!comments_user_id_fkey(username)')
        .eq('report_id', report.id)
        .order('created_at'),
      supabase
        .from('report_updates')
        .select('*, profiles!report_updates_actor_id_fkey(username)')
        .eq('report_id', report.id)
        .order('created_at'),
    ])
    setComments((c.data ?? []) as unknown as Comment[])
    setUpdates((u.data ?? []) as unknown as ReportUpdate[])
  }, [report.id])

  useEffect(() => {
    loadExtra()
  }, [loadExtra])

  const save = async () => {
    if (status === 'selesai' && report.status !== 'selesai' && !afterPhoto) {
      const ok = confirm(
        'Belum ada foto setelah perbaikan.\n\nDisarankan unggah foto sesudah perbaikan dulu (bagian 3) ' +
          'agar pelapor bisa melihat hasilnya.\n\nTetap tandai sebagai selesai?',
      )
      if (!ok) return
    }
    setBusy(true)
    setMsg('')
    const { error } = await supabase
      .from('reports')
      .update({
        status,
        admin_note: note.trim() || null,
        category,
        severity,
        traffic,
        province: region.province.trim(),
        city: region.city.trim(),
        district: region.district.trim(),
        village: region.village.trim(),
      })
      .eq('id', report.id)
    setBusy(false)
    if (error) return setMsg('Gagal menyimpan: ' + error.message)
    setMsg('Tersimpan')
    onChanged()
    loadExtra()
  }

  const addUpdate = async () => {
    if (!updNote.trim() && !updFile) return setMsg('Isi catatan atau pilih foto.')
    setBusy(true)
    setMsg('')
    try {
      let photo_url: string | null = null
      if (updFile) {
        const ext = (updFile.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${profile.id}/after-${Date.now()}.${ext}`
        const up = await supabase.storage.from('report-images').upload(path, updFile, { contentType: updFile.type })
        if (up.error) throw up.error
        photo_url = supabase.storage.from('report-images').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('report_updates').insert({
        report_id: report.id,
        actor_id: profile.id,
        kind: photo_url ? 'after' : 'progress',
        note: updNote.trim(),
        photo_url,
      })
      if (error) throw error
      setUpdNote('')
      setUpdFile(null)
      setMsg('Catatan ditambahkan')
      loadExtra()
    } catch (e) {
      setMsg('Gagal: ' + (e instanceof Error ? e.message : String(e)))
    }
    setBusy(false)
  }

  const remove = async () => {
    if (!confirm(`Hapus laporan "${report.title}" secara permanen?`)) return
    setBusy(true)
    const { error } = await supabase.from('reports').delete().eq('id', report.id)
    if (error) {
      setBusy(false)
      return setMsg('Gagal menghapus: ' + error.message)
    }
    const marker = '/report-images/'
    const i = report.image_url.indexOf(marker)
    if (i >= 0) await supabase.storage.from('report-images').remove([report.image_url.slice(i + marker.length)])
    onChanged()
    onClose()
  }

  const removeComment = async (id: string) => {
    await supabase.from('comments').delete().eq('id', id)
    loadExtra()
    onChanged()
  }

  const pr = priorityLevel(report.priority_score)
  const FLOW: Status[] = ['menunggu', 'diverifikasi', 'diproses', 'selesai']
  const dirty =
    status !== report.status ||
    note.trim() !== (report.admin_note ?? '') ||
    category !== report.category ||
    severity !== report.severity ||
    traffic !== report.traffic ||
    region.province !== report.province ||
    region.city !== report.city ||
    region.district !== report.district ||
    region.village !== report.village
  const still = report.validations.filter((v) => v.still_damaged).length
  const fixed = report.validations.length - still
  const afterPhoto = [...updates].reverse().find((u) => u.kind === 'after' && u.photo_url)?.photo_url

  return (
    <div className="overlay center" onClick={onClose}>
      <section className="dialog" role="dialog" aria-label="Detail laporan" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <div>
            <h3>{report.title}</h3>
            <div className="muted small">
              Dilaporkan oleh @{report.profiles?.username} pada {fmtDate(report.created_at)}
            </div>
          </div>
          <button className="btn" onClick={onClose}>
            Tutup
          </button>
        </header>

        <div className="dialog-body">
          {/* ====== KIRI: isi laporan ====== */}
          <div className="col col-info">
            <div className="photos">
              <figure>
                <figcaption>{afterPhoto ? 'Sebelum perbaikan' : 'Foto laporan'}</figcaption>
                <ReportImage className="detail-img" src={report.image_url} alt={report.title} full />
              </figure>
              {afterPhoto && (
                <figure>
                  <figcaption>Setelah perbaikan</figcaption>
                  <ReportImage className="detail-img" src={afterPhoto} alt="Setelah perbaikan" full />
                </figure>
              )}
            </div>

            <div className="chips">
              <span className={`badge ${pr.cls}`}>
                Prioritas {pr.label} (skor {report.priority_score})
              </span>
              <span className="badge s-ditolak">{CATEGORY_LABEL[report.category]}</span>
              <span className={`badge s-${report.status}`}>{STATUS_LABEL[report.status]}</span>
            </div>

            {report.description && <p className="desc">{report.description}</p>}

            <dl className="facts">
              <dt>Lokasi</dt>
              <dd>
                {report.address || 'Alamat tidak diisi'}
                {report.latitude != null && report.longitude != null && (
                  <>
                    {' '}
                    <a href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`} target="_blank" rel="noreferrer">
                      Buka di Google Maps
                    </a>
                  </>
                )}
              </dd>
              <dt>Konfirmasi warga</dt>
              <dd>
                {still} menyatakan masih rusak, {fixed} menyatakan sudah diperbaiki
              </dd>
              <dt>Dukungan</dt>
              <dd>
                {report.likes[0]?.count ?? 0} suka, {report.comments[0]?.count ?? 0} komentar
              </dd>
            </dl>

            {report.ai_summary && (
              <div className="alert info">
                <b>Analisis AI</b> ({report.ai_category}, tingkat {report.ai_severity},{' '}
                {Math.round((report.ai_confidence ?? 0) * 100)}% yakin): {report.ai_summary}
                <div className="small">Hanya bahan pertimbangan. Verifikasi tetap oleh petugas.</div>
              </div>
            )}

            <h4>Komentar warga ({comments.length})</h4>
            {comments.length === 0 && <p className="muted small">Belum ada komentar.</p>}
            {comments.map((c) => (
              <div className="comment" key={c.id}>
                <div className="grow">
                  <b>@{c.profiles?.username}</b> <span className="muted small">{fmtDate(c.created_at)}</span>
                  <div>{c.body}</div>
                </div>
                {profile.role === 'admin' && (
                  <button className="btn small-btn" onClick={() => removeComment(c.id)}>
                    Hapus komentar
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ====== KANAN: tindakan ====== */}
          <div className="col col-actions">
            <div className="block">
              <h4>1. Ubah status penanganan</h4>
              <div className="steps">
                {FLOW.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    className={`step ${status === s ? 'on' : ''}`}
                    onClick={() => setStatus(s)}
                    aria-pressed={status === s}
                  >
                    <span className="n">{i + 1}</span>
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`btn reject ${status === 'ditolak' ? 'on' : ''}`}
                onClick={() => setStatus('ditolak')}
                aria-pressed={status === 'ditolak'}
              >
                Tolak laporan (tidak valid)
              </button>
              <p className="hint">
                Status dipilih: <b>{STATUS_LABEL[status]}</b>
                {status !== report.status && ' (belum disimpan)'}
              </p>
              {status === 'selesai' && !afterPhoto && (
                <div className="alert warn">Belum ada foto setelah perbaikan. Unggah dulu di bagian 3 agar pelapor bisa melihat hasil perbaikannya.</div>
              )}

              <label>Tanggapan untuk pelapor</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tampil di aplikasi warga. Contoh: Tim survei dijadwalkan hari Senin."
              />
            </div>

            <div className="block">
              <h4>2. Penilaian prioritas</h4>
              <div className="grid3">
                <div>
                  <label>Jenis masalah</label>
                  <Select label="Jenis masalah" value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} />
                </div>
                <div>
                  <label>Tingkat bahaya</label>
                  <Select label="Tingkat bahaya" value={severity} onChange={setSeverity} options={[1, 2, 3].map((v) => ({ value: v, label: SEVERITY_LABEL[v] }))} />
                </div>
                <div>
                  <label>Lalu lintas</label>
                  <Select label="Lalu lintas" value={traffic} onChange={setTraffic} options={[{ value: 'rendah', label: 'Rendah' }, { value: 'sedang', label: 'Sedang' }, { value: 'tinggi', label: 'Tinggi' }]} />
                </div>
              </div>

              <label>Wilayah laporan</label>
              <div className="grid2">
                <input placeholder="Provinsi" value={region.province} onChange={(e) => setRegion({ ...region, province: e.target.value })} />
                <input placeholder="Kabupaten/Kota" value={region.city} onChange={(e) => setRegion({ ...region, city: e.target.value })} />
                <input placeholder="Kecamatan" value={region.district} onChange={(e) => setRegion({ ...region, district: e.target.value })} />
                <input placeholder="Desa/Kelurahan" value={region.village} onChange={(e) => setRegion({ ...region, village: e.target.value })} />
              </div>
            </div>

            <div className="block">
              <h4>3. Riwayat dan dokumentasi perbaikan</h4>
              {updates.map((u) => (
                <div className="tl-item" key={u.id}>
                  <span className={`tl-dot ${u.status ? `s-${u.status}` : ''}`} />
                  <div className="grow">
                    <b>{u.kind === 'status' ? STATUS_LABEL[u.status as Status] : u.kind === 'after' ? 'Foto setelah perbaikan' : 'Catatan petugas'}</b>{' '}
                    <span className="muted small">
                      {fmtDate(u.created_at)}
                      {u.profiles?.username ? ` oleh @${u.profiles.username}` : ''}
                    </span>
                    {u.note && <div>{u.note}</div>}
                    {u.photo_url && <ReportImage className="timeline-img" src={u.photo_url} alt="Dokumentasi" full />}
                  </div>
                </div>
              ))}

              <div className="add-update">
                <label>Tambah catatan atau foto setelah perbaikan</label>
                <textarea rows={2} value={updNote} onChange={(e) => setUpdNote(e.target.value)} placeholder="Contoh: Penambalan aspal selesai dikerjakan." />
                <input type="file" accept="image/*" onChange={(e) => setUpdFile(e.target.files?.[0] ?? null)} />
                <button className="btn" onClick={addUpdate} disabled={busy}>
                  Tambahkan ke riwayat
                </button>
                <p className="hint">Ini langsung tersimpan, terpisah dari tombol Simpan perubahan.</p>
              </div>
            </div>

            {profile.role === 'admin' && (
              <div className="block danger-zone">
                <h4>Hapus laporan</h4>
                <p className="hint">Laporan, foto, komentar, dan riwayatnya dihapus permanen dan tidak bisa dikembalikan.</p>
                <button className="btn danger" onClick={remove} disabled={busy}>
                  Hapus laporan ini
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="dialog-foot">
          <span className={`save-state ${dirty ? 'dirty' : ''}`}>
            {msg || (dirty ? 'Ada perubahan yang belum disimpan' : 'Semua perubahan sudah tersimpan')}
          </span>
          <button className="btn" onClick={onClose}>
            Tutup
          </button>
          <button className="btn primary big" onClick={save} disabled={busy || !dirty}>
            {busy ? 'Menyimpan...' : 'Simpan perubahan'}
          </button>
        </footer>
      </section>
    </div>
  )
}