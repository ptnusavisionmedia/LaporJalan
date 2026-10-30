import { useState } from 'react'

export function ReportImage({ src, alt, className, full = false }: {
  src: string; alt: string; className?: string; full?: boolean
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (failedSrc === src) {
    return (
      <div className={`${className ?? ''} photo-unavailable`} role="img" aria-label={`Foto tidak dapat dimuat: ${alt}`}>
        <span>Foto tidak dapat dimuat.</span>
        {full && <small>Jika file rusak, minta pelapor mengganti foto melalui detail laporan di aplikasi.</small>}
        <button className="btn small-btn" onClick={(event) => { event.stopPropagation(); setFailedSrc(null) }}>Coba lagi</button>
      </div>
    )
  }
  const image = <img className={className} src={src} alt={alt} onError={() => setFailedSrc(src)} />
  return full ? <a href={src} target="_blank" rel="noreferrer" aria-label="Buka foto ukuran penuh">{image}</a> : image
}
