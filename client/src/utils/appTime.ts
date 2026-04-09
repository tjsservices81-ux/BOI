const KEY = 'customAppTimestamp';

export function getAppDate(): Date {
  const saved = localStorage.getItem(KEY);
  if (saved) {
    const d = new Date(saved);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function setCustomAppDate(date: Date | null): void {
  if (date) {
    localStorage.setItem(KEY, date.toISOString());
  } else {
    localStorage.removeItem(KEY);
  }
}

export function hasCustomAppDate(): boolean {
  return !!localStorage.getItem(KEY);
}

export function getCustomAppDateISO(): string | null {
  return localStorage.getItem(KEY);
}
