import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE;

function getCurrentUserId(explicit) {
  if (explicit != null) return explicit;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u.UserID || u.userId || u.id || null;
  } catch {
    return null;
  }
}

export async function logAudit(actionCode, targetType, targetId, details, userIdOverride) {
  if (!actionCode) return null;
  let payloadDetails = details;
  if (payloadDetails && typeof payloadDetails === 'object') {
    try { payloadDetails = JSON.stringify(payloadDetails); } catch { /* ignore */ }
  }
  const payload = {
    actionCode,
    targetType: targetType || null,
    targetId: targetId ?? null,
    details: payloadDetails,
    userId: getCurrentUserId(userIdOverride)
  };
  try {
    const res = await axios.post(`${API_BASE}/audit`, payload);
    return res.data?.auditId ?? null;
  } catch {
    return null;
  }
}