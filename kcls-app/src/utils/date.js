// Numeric-only date formatting utilities
// Ensures consistency across the app: no month names, only numbers.
// Date format: YYYY-MM-DD
// DateTime format: YYYY-MM-DD HH:MM:SS (local time, 24h)

const pad = (n) => String(n).padStart(2, '0');

export const formatDate = (value) => {
  if (value === null || value === undefined || value === '') return '';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch { return ''; }
};

export const formatDateTime = (value) => {
  if (value === null || value === undefined || value === '') return '';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch { return ''; }
};

export const nowDateTime = () => formatDateTime(new Date());

export default { formatDate, formatDateTime, nowDateTime };
