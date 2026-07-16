const API_ROOT = import.meta.env.VITE_API_URL || '';

export async function request(path, { token, method = 'GET', body, signal } = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    signal,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Request failed.');
  return payload;
}

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: (token) => request('/api/auth/me', { token }),
  dashboard: (token) => request('/api/dashboard', { token }),
  insights: (token) => request('/api/insights', { token }),
  assets: (token, params = {}) => request(`/api/assets?${new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString()}`, { token }),
  asset: (token, id) => request(`/api/assets/${id}`, { token }),
  lookup: (token, code) => request(`/api/assets/lookup/${encodeURIComponent(code)}`, { token }),
  createAsset: (token, body) => request('/api/assets', { token, method: 'POST', body }),
  updateAsset: (token, id, body) => request(`/api/assets/${id}`, { token, method: 'PATCH', body }),
  checkout: (token, assetId, body) => request(`/api/assignments/${assetId}/checkout`, { token, method: 'POST', body }),
  returnAsset: (token, assignmentId, body) => request(`/api/assignments/${assignmentId}/return`, { token, method: 'POST', body }),
  assignments: (token, state) => request(`/api/assignments?state=${state || 'active'}`, { token }),
  maintenance: (token, status) => request(`/api/maintenance${status ? `?status=${status}` : ''}`, { token }),
  createMaintenance: (token, body) => request('/api/maintenance', { token, method: 'POST', body }),
  updateMaintenance: (token, id, body) => request(`/api/maintenance/${id}`, { token, method: 'PATCH', body }),
  report: (token, type) => request(`/api/reports/${type}`, { token }),
};
