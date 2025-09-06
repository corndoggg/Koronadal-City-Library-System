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
  } catch {}
}

export function clearOverride() {
  try {
    localStorage.removeItem(OVERRIDE_KEY);
  } catch {}
}

// Loads/saves settings via backend. Uses VITE_API_BASE for the API base.
const API_BASE = String(import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '');

export async function loadSystemSettings() {
  try {
    const res = await fetch(`${API_BASE}/system/settings`, { cache: 'no-cache' });
    if (!res.ok) throw new Error('settings api failed');
    const json = await res.json();
    return { ...json, _source: 'server' };
  } catch {
    try {
      const res = await fetch('/system.json', { cache: 'no-cache' });
      if (res.ok) {
        const json = await res.json();
        return { ...json, _source: 'public' };
      }
    } catch {}
    return { fine: 5, _source: 'default' };
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
  return { ...saved, _source: 'server' };
}