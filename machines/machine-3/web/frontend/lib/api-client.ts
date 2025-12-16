export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Default to relative /api so it works behind nginx on one port.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== 'undefined' ? '/api' : 'http://localhost:3001/api');

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const message = await res.text();
    throw new ApiError(message || res.statusText, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    me: () => apiFetch('/auth/me'),
    login: (payload: { email: string; password: string }) =>
      apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  },
  org: {
    listUsers: (params?: { depId?: number; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.depId) query.append('depId', String(params.depId));
      if (params?.search) query.append('search', params.search);
      return apiFetch(`/org/users${query.toString() ? `?${query.toString()}` : ''}`);
    },
    getUser: (id: number) => apiFetch(`/org/users/${id}`),
    departments: () => apiFetch('/org/departments'),
    projects: () => apiFetch('/org/projects'),
  },
  projects: {
    get: (id: number) => apiFetch(`/projects/${id}`),
    members: (id: number) => apiFetch(`/projects/${id}/members`),
  },
  files: {
    list: (ownerId: number) => apiFetch(`/files?ownerId=${ownerId}`),
    downloadPathUrl: (relativePath: string) => `${API_BASE}/files/${encodeURI(relativePath)}`,
  },
  settings: {
    get: () => apiFetch('/settings'),
    updateTheme: (theme: 'light' | 'dark') => apiFetch('/settings/theme', { method: 'POST', body: JSON.stringify({ theme }) }),
  },
};
