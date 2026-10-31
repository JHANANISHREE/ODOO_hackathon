const API_BASE = '/api';

export function getAccessToken() {
  return localStorage.getItem('bl_access_token');
}

export function getRefreshToken() {
  return localStorage.getItem('bl_refresh_token');
}

export function setTokens(access, refresh) {
  if (access) localStorage.setItem('bl_access_token', access);
  if (refresh) localStorage.setItem('bl_refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('bl_access_token');
  localStorage.removeItem('bl_refresh_token');
  localStorage.removeItem('bl_user');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.clear();
}

export function getCurrentUser() {
  const userStr = localStorage.getItem('bl_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

export function setCurrentUser(user) {
  localStorage.setItem('bl_user', JSON.stringify(user));
}

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) {
    clearTokens();
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh })
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch (err) {
    clearTokens();
    return null;
  }
}

export async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = options.headers ? { ...options.headers } : {};

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const startTime = performance.now();
  let response;

  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw {
      code: 'NETWORK_ERROR',
      message: 'Network connection error. Please verify the server is running.',
      fields: {}
    };
  }

  const duration = ((performance.now() - startTime) / 1000).toFixed(3);
  const pill = document.getElementById('perf-response-time');
  if (pill) {
    pill.textContent = `Response: ${duration}s`;
  }

  if (response.status === 401 && !options._retry && getRefreshToken()) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      if (newToken) {
        onRefreshed(newToken);
        return request(endpoint, { ...options, _retry: true });
      } else {
        window.location.href = '/login.html';
        return;
      }
    } else {
      return new Promise(resolve => {
        subscribeTokenRefresh(token => {
          options._retry = true;
          resolve(request(endpoint, options));
        });
      });
    }
  }

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    if (data && data.error) {
      throw data.error;
    }
    throw {
      code: `HTTP_${response.status}`,
      message: (typeof data === 'string' && data) ? data : response.statusText,
      fields: {}
    };
  }

  return data;
}

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, {
    ...options,
    method: 'POST',
    body: (body instanceof FormData) ? body : JSON.stringify(body)
  }),
  put: (endpoint, body, options) => request(endpoint, {
    ...options,
    method: 'PUT',
    body: (body instanceof FormData) ? body : JSON.stringify(body)
  }),
  patch: (endpoint, body, options) => request(endpoint, {
    ...options,
    method: 'PATCH',
    body: (body instanceof FormData) ? body : JSON.stringify(body)
  }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' })
};
