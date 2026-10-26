export function formatDate(value: string, locale = 'id-ID') {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))
}

export function formatMoney(value: number, currency: string, locale = 'id-ID') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value))
}

export function toDateTimeLocal(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
