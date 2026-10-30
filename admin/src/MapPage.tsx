import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  CATEGORY_LABEL,
  fetchReports,
  isAccess,
  priorityLevel,
  STATUS_COLOR,
  STATUS_LABEL,
  type Profile,
  type Report,
} from './lib'

type Filter = 'aktif' | 'prioritas' | 'aksesibilitas' | 'semua'

export function MapPage({ profile, onOpen }: { profile: Profile; onOpen: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const fitted = useRef(false)
  const [reports, setReports] = useState<Report[]>([])
  const [filter, setFilter] = useState<Filter>('aktif')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReports(profile)
      .then(setReports)
      .catch((e) => setError(e.message))
  }, [profile])

  // init peta sekali
  useEffect(() => {
    if (!el.current || map.current) return
    map.current = L.map(el.current).setView([-2.5, 118], 5) // Indonesia
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  const shown = reports.filter((r) => {
    if (r.latitude == null || r.longitude == null) return false
    const active = r.status !== 'selesai' && r.status !== 'ditolak'
    if (filter === 'aktif') return active
    if (filter === 'prioritas') return active && r.priority_score >= 80
    if (filter === 'aksesibilitas') return isAccess(r.category)
    return true
  })

  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()
    const pts: L.LatLngExpression[] = []
    for (const r of shown) {
      const pos: L.LatLngExpression = [r.latitude!, r.longitude!]
      pts.push(pos)
      const radius = 6 + r.severity * 2
      const marker = L.circleMarker(pos, {
        radius,
        color: isAccess(r.category) ? '#0369a1' : '#ffffff',
        weight: 2,
        fillColor: STATUS_COLOR[r.status],
        fillOpacity: 0.9,
      })
      const pr = priorityLevel(r.priority_score)
      const div = document.createElement('div')
      div.innerHTML = `<b></b><br><span class="small"></span><br><span class="small"></span><br><a href="#">Buka detail</a>`
      div.querySelector('b')!.textContent = r.title
      const spans = div.querySelectorAll('span')
      spans[0].textContent = `${CATEGORY_LABEL[r.category]} · ${STATUS_LABEL[r.status]}`
      spans[1].textContent = `Prioritas ${pr.label} (${r.priority_score})`
      div.querySelector('a')!.addEventListener('click', (e) => {
        e.preventDefault()
        onOpen(r.id)
      })
      marker.bindPopup(div)
      marker.addTo(g)
    }
    if (pts.length && !fitted.current) {
      m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 })
      fitted.current = true
    }
  }, [shown, onOpen])

  const filters: [Filter, string][] = [
    ['aktif', 'Belum selesai'],
    ['prioritas', 'Prioritas tinggi'],
    ['aksesibilitas', 'Aksesibilitas'],
    ['semua', 'Semua'],
  ]

  return (
    <>
      <h2>Peta Kerusakan</h2>
      <div className="toolbar">
        {filters.map(([k, label]) => (
          <button key={k} className={`btn ${filter === k ? 'primary' : ''}`} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
        <span className="muted small grow" style={{ alignSelf: 'center' }}>
          {shown.length} titik · ukuran = tingkat bahaya · tepi biru = aksesibilitas
        </span>
      </div>
      {error && <div className="alert error">{error}</div>}
      <div className="legend">
        {(Object.keys(STATUS_COLOR) as (keyof typeof STATUS_COLOR)[]).map((s) => (
          <span key={s}>
            <i style={{ background: STATUS_COLOR[s] }} /> {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
      <div ref={el} className="map" />
    </>
  )
}
