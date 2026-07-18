const API_ROOT = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, { status, code, requestId } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

function apiUrl(path) {
  if (!API_ROOT) throw new ApiError('The application API is not configured. Please contact your administrator.', { code: 'API_NOT_CONFIGURED' });
  return `${API_ROOT}${path}`;
}

export async function request(path, { token, method = 'GET', body, signal } = {}) {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (error.name === 'AbortError' && signal?.aborted) throw error;
    if (error.name === 'AbortError') throw new ApiError('The asset service took too long to respond. Please try again.', { code: 'REQUEST_TIMEOUT' });
    throw new ApiError('Unable to reach the asset service. Check your connection and try again.', { code: 'NETWORK_ERROR' });
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.message || 'The request could not be completed.', { status: response.status, code: payload.code, requestId: payload.requestId });
  return payload;
}

export const api = {
  login: async (email, password) => {
    try { return await request('/api/auth/login', { method: 'POST', body: { email, password } }); }
    catch (error) {
      if (error.status === 401 || error.status === 422) throw new ApiError('Invalid email or password.', { status: error.status, code: 'INVALID_CREDENTIALS' });
      throw error;
    }
  },
  me: (token) => request('/api/auth/me', { token }),
  dashboard: (token) => request('/api/dashboard', { token }),
  insights: (token) => request('/api/insights', { token }),
  assets: (token, params = {}) => request(`/api/assets?${new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== '')).toString()}`, { token }),
  asset: (token, id) => request(`/api/assets/${encodeURIComponent(id)}`, { token }),
  lookup: (token, code) => request(`/api/assets/lookup/${encodeURIComponent(code)}`, { token }),
  createAsset: (token, body) => request('/api/assets', { token, method: 'POST', body }),
  updateAsset: (token, id, body) => request(`/api/assets/${encodeURIComponent(id)}`, { token, method: 'PATCH', body }),
  checkout: (token, assetId, body) => request(`/api/assignments/${encodeURIComponent(assetId)}/checkout`, { token, method: 'POST', body }),
  returnAsset: (token, assignmentId, body) => request(`/api/assignments/${encodeURIComponent(assignmentId)}/return`, { token, method: 'POST', body }),
  assignments: (token, state) => request(`/api/assignments?state=${encodeURIComponent(state || 'active')}`, { token }),
  maintenance: (token, status) => request(`/api/maintenance${status ? `?status=${encodeURIComponent(status)}` : ''}`, { token }),
  createMaintenance: (token, body) => request('/api/maintenance', { token, method: 'POST', body }),
  updateMaintenance: (token, id, body) => request(`/api/maintenance/${encodeURIComponent(id)}`, { token, method: 'PATCH', body }),
  report: (token, type) => request(`/api/reports/${encodeURIComponent(type)}`, { token }),
};
