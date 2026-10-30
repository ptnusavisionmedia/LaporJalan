import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

export interface Option<T extends string | number> {
  value: T
  label: string
}

interface Props<T extends string | number> {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  label?: string // dibaca pembaca layar
  className?: string
}

/** Dropdown bertema (pengganti <select> bawaan browser). Bisa dipakai dengan keyboard. */
export function Select<T extends string | number>({ value, onChange, options, label, className = '' }: Props<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLUListElement>(null)
  const id = useId()
  const current = options.find((o) => o.value === value)

  const openMenu = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  // tutup saat klik di luar
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // pastikan pilihan aktif terlihat
  useEffect(() => {
    if (open) menu.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const choose = (v: T) => {
    onChange(v)
    setOpen(false)
  }

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') return setOpen(false)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return openMenu()
      const d = e.key === 'ArrowDown' ? 1 : -1
      setActive((a) => (a + d + options.length) % options.length)
    } else if (e.key === 'Home' || e.key === 'End') {
      if (open) {
        e.preventDefault()
        setActive(e.key === 'Home' ? 0 : options.length - 1)
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!open) openMenu()
      else choose(options[active].value)
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className={`select ${open ? 'open' : ''} ${className}`} ref={root}>
      <button
        type="button"
        className="select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKey}
      >
        <span className="select-value">{current?.label ?? ''}</span>
        <svg className="select-chevron" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="select-menu" role="listbox" id={id} ref={menu}>
          {options.map((o, i) => (
            <li
              key={String(o.value)}
              role="option"
              aria-selected={o.value === value}
              className={`select-option ${i === active ? 'active' : ''} ${o.value === value ? 'selected' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o.value)}
            >
              <span>{o.label}</span>
              {o.value === value && (
                <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                  <path d="m4.5 10.5 3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
