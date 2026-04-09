const OFFSET_KEY = 'customAppTimeOffset';
const OLD_KEY = 'customAppTimestamp';

// Migrate anyone who had the old frozen-timestamp format
function migrate() {
  const old = localStorage.getItem(OLD_KEY);
  if (old) {
    const d = new Date(old);
    if (!isNaN(d.getTime())) {
      const offset = d.getTime() - Date.now();
      localStorage.setItem(OFFSET_KEY, String(offset));
    }
    localStorage.removeItem(OLD_KEY);
  }
}
migrate();

export function getAppDate(): Date {
  const saved = localStorage.getItem(OFFSET_KEY);
  if (saved !== null) {
    const offset = Number(saved);
    if (!isNaN(offset)) {
      return new Date(Date.now() + offset);
    }
  }
  return new Date();
}

export function setCustomAppDate(date: Date | null): void {
  if (date) {
    const offset = date.getTime() - Date.now();
    localStorage.setItem(OFFSET_KEY, String(offset));
  } else {
    localStorage.removeItem(OFFSET_KEY);
  }
}

export function hasCustomAppDate(): boolean {
  return localStorage.getItem(OFFSET_KEY) !== null;
}

export function getCustomAppDateISO(): string | null {
  const saved = localStorage.getItem(OFFSET_KEY);
  if (saved !== null) {
    const offset = Number(saved);
    if (!isNaN(offset)) {
      return new Date(Date.now() + offset).toISOString();
    }
  }
  return null;
}
