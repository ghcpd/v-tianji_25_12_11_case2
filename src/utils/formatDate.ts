import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'

export function formatDate(date: Date): string {
  if (isToday(date)) {
    return format(date, 'HH:mm')
  }
  if (isYesterday(date)) {
    return `Yesterday ${format(date, 'HH:mm')}`
  }
  return format(date, 'MMM d, yyyy')
}

export function formatRelativeDate(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true })
}

