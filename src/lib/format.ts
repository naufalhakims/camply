export function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

export function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(Number(value))
}

export function toDateTimeLocal(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
