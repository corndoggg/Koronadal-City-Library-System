const DEFAULT_SETTINGS = {
  fine: 5,
  borrow_limit: 3,
  auto_backup_enabled: false,
  auto_backup_time: '02:00',
  auto_backup_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

const normalizeSettings = (raw, source) => {
  const out = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  const fineVal = Number(out.fine);
  out.fine = Number.isFinite(fineVal) && fineVal >= 0 ? fineVal : DEFAULT_SETTINGS.fine;

  const borrowVal = Number(out.borrow_limit);
  out.borrow_limit = Number.isFinite(borrowVal) && borrowVal > 0 ? Math.trunc(borrowVal) : DEFAULT_SETTINGS.borrow_limit;

  out.auto_backup_enabled = typeof out.auto_backup_enabled === 'boolean'
    ? out.auto_backup_enabled
    : DEFAULT_SETTINGS.auto_backup_enabled;

  out.auto_backup_time = normalizeTime(out.auto_backup_time ?? DEFAULT_SETTINGS.auto_backup_time);

  out.auto_backup_days = normalizeDays(out.auto_backup_days ?? DEFAULT_SETTINGS.auto_backup_days);

  return { ...out, _source: source };
};

const normalizeTime = (value) => {
  if (typeof value === 'string') {
    const parts = value.trim().split(':');
    if (parts.length === 2) {
      const hour = Number(parts[0]);
      const minute = Number(parts[1]);
      if (Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
    }
  }
  return DEFAULT_SETTINGS.auto_backup_time;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const normalizeDays = (value) => {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const seen = new Set();
  items.forEach((item) => {
    const str = String(item || '').trim();
    if (!str) return;
    const lookup = WEEKDAYS.find((day) => day.toLowerCase() === str.slice(0, 3).toLowerCase());
    if (lookup) {
      seen.add(lookup);
    }
  });
  if (!seen.size) {
    WEEKDAYS.forEach((d) => seen.add(d));
  }
  return Array.from(seen);
};

const OVERRIDE_KEY = 'systemSettingsOverride';

export function getOverride() {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function setOverride(obj) {
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(obj || {}));
  } catch {
    // ignore storage read errors
  }
}

export function clearOverride() {
  try {
    localStorage.removeItem(OVERRIDE_KEY);
  } catch {
    // ignore storage write errors
  }
}

// Loads/saves settings via backend. Uses VITE_API_BASE for the API base.
const API_BASE = String(import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '');

export async function loadSystemSettings() {
  try {
    const res = await fetch(`${API_BASE}/system/settings`, { cache: 'no-cache' });
    if (!res.ok) throw new Error('settings api failed');
    const json = await res.json();
    return normalizeSettings(json, 'server');
  } catch {
    try {
      const res = await fetch('/system.json', { cache: 'no-cache' });
      if (res.ok) {
        const json = await res.json();
        return normalizeSettings(json, 'public');
      }
    } catch {
      // ignore static fallback errors
    }
    return normalizeSettings({}, 'default');
  }
}

export async function saveSystemSettings(partial) {
  const res = await fetch(`${API_BASE}/system/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to save settings');
  }
  const saved = await res.json();
  return normalizeSettings(saved, 'server');
}

export async function loadBackupSchedule() {
  const res = await fetch(`${API_BASE}/system/settings/backup-schedule`, { cache: 'no-cache' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to load backup schedule');
  }
  const json = await res.json();
  return {
    enabled: Boolean(json?.auto_backup_enabled),
    time: normalizeTime(json?.auto_backup_time),
    days: normalizeDays(json?.auto_backup_days),
  };
}

export async function saveBackupSchedule(payload) {
  const res = await fetch(`${API_BASE}/system/settings/backup-schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to save backup schedule');
  }
  const json = await res.json();
  return {
    enabled: Boolean(json?.auto_backup_enabled),
    time: normalizeTime(json?.auto_backup_time),
    days: normalizeDays(json?.auto_backup_days),
  };
}