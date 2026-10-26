import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useLanguage } from '../lib/i18n'

type FilterOption = { value: string; label: string }

function useDismissOnOutside(ref: { current: HTMLElement | null }, close: () => void) {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [close, ref])
}

export function TripFilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.findIndex(option => option.value === value)))
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const close = () => setOpen(false)
  useDismissOnOutside(rootRef, close)
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value))
  const selected = options[selectedIndex]

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setActiveIndex(selectedIndex)
        setOpen(true)
      } else {
        setActiveIndex(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
      }
    } else if (event.key === 'Enter' || event.key === ' ') {
      if (open) {
        event.preventDefault()
        onChange(options[activeIndex]?.value ?? '')
        close()
      }
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      close()
    }
  }

  return <div className="filter-popup-root">
    <button
      type="button"
      className="filter-popup-trigger"
      role="combobox"
      aria-label={label}
      aria-controls={menuId}
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-activedescendant={open ? `${menuId}-option-${activeIndex}` : undefined}
      onClick={() => { setActiveIndex(selectedIndex); setOpen(current => !current) }}
      onKeyDown={handleKeyDown}
    >
      <span>{selected?.label ?? ''}</span>
      <span className={`filter-popup-chevron ${open ? 'filter-popup-chevron-open' : ''}`} aria-hidden="true" />
    </button>
    {open && <div id={menuId} className="filter-popup-menu" role="listbox" aria-label={label}>
      {options.map((option, index) => <button
        id={`${menuId}-option-${index}`}
        key={option.value}
        type="button"
        role="option"
        tabIndex={-1}
        aria-selected={option.value === value}
        className={`filter-popup-option ${index === activeIndex ? 'filter-popup-option-active' : ''}`}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => { onChange(option.value); close() }}
      >
        <span>{option.label}</span>
        {option.value === value && <span className="filter-option-check" aria-hidden="true">✓</span>}
      </button>)}
    </div>}
    <span className="sr-only">{t('Pilih dengan tombol panah, lalu tekan Enter.')}</span>
  </div>
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function TripFilterDate({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { language, t } = useLanguage()
  const locale = language === 'en' ? 'en-US' : 'id-ID'
  const selectedDate = value ? new Date(`${value}T12:00:00`) : null
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const rootRef = useRef<HTMLDivElement>(null)
  const calendarId = useId()
  const close = () => setOpen(false)
  useDismissOnOutside(rootRef, close)

  function shiftMonth(offset: number) {
    setVisibleMonth(month => new Date(month.getFullYear(), month.getMonth() + offset, 1))
  }

  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate()
  const calendarCells = Array.from({ length: Math.ceil((mondayFirstOffset + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - mondayFirstOffset + 1
    return day >= 1 && day <= daysInMonth ? new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day) : null
  })
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, index + 1)))
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(visibleMonth)
  const formattedValue = selectedDate ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(selectedDate) : t('Pilih tanggal')

  return <div className="filter-popup-root filter-date-root" ref={rootRef}>
    <button
      type="button"
      className={`filter-popup-trigger filter-date-trigger ${value ? 'filter-date-has-value' : ''}`}
      aria-label={t('Pilih tanggal keberangkatan')}
      aria-controls={calendarId}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={() => setOpen(current => !current)}
    >
      <span>{formattedValue}</span>
      <svg className="filter-calendar-icon" viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="5" width="14" height="12" rx="2" /><path d="M6.5 3v4M13.5 3v4M3 8.5h14" /></svg>
    </button>
    {open && <div id={calendarId} className="filter-calendar-popover" role="dialog" aria-label={t('Pilih tanggal keberangkatan')}>
      <div className="filter-calendar-heading">
        <strong>{monthLabel}</strong>
        <div>
          <button type="button" className="filter-calendar-nav" aria-label={t('Bulan sebelumnya')} onClick={() => shiftMonth(-1)}>‹</button>
          <button type="button" className="filter-calendar-nav" aria-label={t('Bulan berikutnya')} onClick={() => shiftMonth(1)}>›</button>
        </div>
      </div>
      <div className="filter-calendar-grid" role="grid" aria-label={monthLabel}>
        {weekdays.map((weekday, index) => <span className="filter-calendar-weekday" role="columnheader" key={`${weekday}-${index}`}>{weekday}</span>)}
        {calendarCells.map((date, index) => {
          if (!date) return <span className="filter-calendar-empty" role="gridcell" key={`empty-${index}`} />
          const isoDate = toISODate(date)
          const isSelected = isoDate === value
          const isToday = isoDate === toISODate(new Date())
          return <button
            type="button"
            role="gridcell"
            key={isoDate}
            aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date)}
            aria-pressed={isSelected}
            aria-current={isToday ? 'date' : undefined}
            className={`filter-calendar-day ${isSelected ? 'filter-calendar-day-selected' : ''} ${isToday ? 'filter-calendar-day-today' : ''}`}
            onClick={() => { onChange(isoDate); close() }}
          >{date.getDate()}</button>
        })}
      </div>
      <div className="filter-calendar-footer">
        <button type="button" className="filter-calendar-today" onClick={() => { onChange(toISODate(new Date())); close() }}>{t('Hari ini')}</button>
        {value && <button type="button" className="filter-calendar-clear" onClick={() => { onChange(''); close() }}>{t('Hapus tanggal')}</button>}
      </div>
    </div>}
  </div>
}
