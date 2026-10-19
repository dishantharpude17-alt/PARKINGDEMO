import type { AppSettings } from '../types/appSettings.ts'

export function formatLocalDateTime(
  iso: string,
  preferences: Pick<AppSettings, 'dateFormat' | 'timeFormat'>,
): string {
  const date = new Date(iso)
  const datePart = date.toLocaleDateString(undefined, {
    dateStyle: preferences.dateFormat,
  })
  const timePart = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: preferences.timeFormat === '12h',
  })
  return `${datePart}, ${timePart}`
}
