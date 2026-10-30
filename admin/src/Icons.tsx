// Ikon memakai aset resmi LaporJalan (public/ikon.svg, dari design/icons/fitur). Warna mengikuti teks (currentColor).
const ids = {
  dashboard: 'lj-dashboard',
  map: 'lj-peta',
  list: 'lj-daftar-laporan',
  chart: 'lj-statistik',
  users: 'lj-pengguna',
  logout: 'lj-keluar',
} as const

export function Icon({ name }: { name: keyof typeof ids }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <use href={`/ikon.svg#${ids[name]}`} />
    </svg>
  )
}

/** Logo utama LaporJalan (public/logo.png). */
export function Logo({ size = 34 }: { size?: number; light?: boolean }) {
  return <img src="/logo.png" width={size} height={size} alt="" style={{ borderRadius: size * 0.22, display: 'block' }} />
}