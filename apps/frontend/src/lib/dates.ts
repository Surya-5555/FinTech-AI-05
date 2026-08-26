import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
  if (!isValid(date)) return '-';
  return format(date, 'MMM d, yyyy HH:mm:ss');
}


