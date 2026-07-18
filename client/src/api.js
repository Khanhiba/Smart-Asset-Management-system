import { createDemoSession, demoRequest, isDemoToken } from './demoApi.js';

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

export function isBackendUnavailable(error) {
  return ['API_NOT_CONFIGURED', 'NETWORK_ERROR', 'REQUEST_TIMEOUT'].includes(error?.code) || [502, 503, 504].includes(error?.status);
}

function apiUrl(path) {
  if (!API_ROOT) throw new ApiError('The production asset service is unavailable. Demo Mode can still be used with a seeded demo account.', { code: 'API_NOT_CONFIGURED' });
  return API_ROOT + path;
}

export async function request(path, { token, method = 'GET', body, signal } = {}) {
  if (isDemoToken(token)) return demoRequest(path, { token, method, body });

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(token && { Authorization: 'Bearer ' + token }) },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (error.name === 'AbortError' && signal?.aborted) throw error;
    if (error.name === 'AbortError') throw new ApiError('The asset service took too long to respond. Please try again.', { code: 'REQUEST_TIMEOUT' });
    throw new ApiError('Unable to reach the asset service. Demo Mode is available with a seeded demo account.', { code: 'NETWORK_ERROR' });
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.message || 'The request could not be completed.', { status: response.status, code: payload.code, requestId: payload.requestId });
  return payload;
}

function invalidCredentials(error) {
  return new ApiError('Invalid email or password.', { status: error?.status, code: 'INVALID_CREDENTIALS' });
}

export const api = {
  login: async (email, password) => {
    try {
      const session = await request('/api/auth/login', { method: 'POST', body: { email, password } });
      return { ...session, mode: 'production' };
    } catch (error) {
      if (!isBackendUnavailable(error)) {
        if (error.status === 401 || error.status === 422) throw invalidCredentials(error);
        throw error;
      }
      const demoSession = createDemoSession(email, password);
      if (demoSession) return demoSession;
      throw invalidCredentials(error);
    }
  },
  register: async (body) => {
    try {
      const session = await request('/api/auth/register', { method: 'POST', body });
      return { ...session, mode: 'production' };
    } catch (error) {
      if (isBackendUnavailable(error)) throw new ApiError('Registration needs the production asset service. Demo Mode only supports seeded accounts.', { code: 'REGISTRATION_UNAVAILABLE' });
      throw error;
    }
  },
  me: (token) => request('/api/auth/me', { token }),
  dashboard: (token) => request('/api/dashboard', { token }),
  insights: (token) => request('/api/insights', { token }),
  assets: (token, params = {}) => request('/api/assets?' + new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== '')).toString(), { token }),
  asset: (token, id) => request('/api/assets/' + encodeURIComponent(id), { token }),
  lookup: (token, code) => request('/api/assets/lookup/' + encodeURIComponent(code), { token }),
  createAsset: (token, body) => request('/api/assets', { token, method: 'POST', body }),
  updateAsset: (token, id, body) => request('/api/assets/' + encodeURIComponent(id), { token, method: 'PATCH', body }),
  checkout: (token, assetId, body) => request('/api/assignments/' + encodeURIComponent(assetId) + '/checkout', { token, method: 'POST', body }),
  returnAsset: (token, assignmentId, body) => request('/api/assignments/' + encodeURIComponent(assignmentId) + '/return', { token, method: 'POST', body }),
  assignments: (token, state) => request('/api/assignments?state=' + encodeURIComponent(state || 'active'), { token }),
  maintenance: (token, status) => request('/api/maintenance' + (status ? '?status=' + encodeURIComponent(status) : ''), { token }),
  createMaintenance: (token, body) => request('/api/maintenance', { token, method: 'POST', body }),
  updateMaintenance: (token, id, body) => request('/api/maintenance/' + encodeURIComponent(id), { token, method: 'PATCH', body }),
  report: (token, type) => request('/api/reports/' + encodeURIComponent(type), { token }),
};
