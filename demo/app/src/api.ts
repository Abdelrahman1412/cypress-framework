import type { LeaveRequest, NewLeaveRequest, User } from './types';

export const TOKEN_KEY = 'acme.token';

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error ?? `Request failed (${response.status})`);
  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    call<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => call<User>('/api/me'),
  users: () => call<User[]>('/api/users'),
  leaveRequests: () => call<LeaveRequest[]>('/api/leave-requests'),
  createLeaveRequest: (input: NewLeaveRequest) =>
    call<LeaveRequest>('/api/leave-requests', { method: 'POST', body: JSON.stringify(input) }),
  decide: (id: number, decision: 'approve' | 'reject') =>
    call<LeaveRequest>(`/api/leave-requests/${id}/${decision}`, { method: 'POST' }),
};
