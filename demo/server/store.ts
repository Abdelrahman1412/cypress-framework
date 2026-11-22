export type Role = 'employee' | 'manager' | 'admin';
export type LeaveType = 'annual' | 'sick' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  managerId: string | null;
}

export interface LeaveRequest {
  id: number;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  decidedBy: string | null;
}

const demoPassword = process.env.DEMO_PASSWORD ?? 'acme-demo-pass';

export const users: User[] = [
  { id: 'u-emp', name: 'Erin Employee', email: process.env.EMPLOYEE_EMAIL ?? 'employee@acme.test', role: 'employee', managerId: 'u-mgr' },
  { id: 'u-mgr', name: 'Morgan Manager', email: process.env.MANAGER_EMAIL ?? 'manager@acme.test', role: 'manager', managerId: 'u-adm' },
  { id: 'u-adm', name: 'Avery Admin', email: process.env.ADMIN_EMAIL ?? 'admin@acme.test', role: 'admin', managerId: null },
];

const sessions = new Map<string, string>();
let requests: LeaveRequest[] = [];
let nextId = 1;

export function login(email: string, password: string): { token: string; user: User } | null {
  const user = users.find((u) => u.email === email);
  if (!user || password !== demoPassword) return null;
  const token = crypto.randomUUID();
  sessions.set(token, user.id);
  return { token, user };
}

export function userForToken(token: string | undefined): User | undefined {
  if (!token) return undefined;
  const id = sessions.get(token);
  return users.find((u) => u.id === id);
}

export function visibleRequests(viewer: User): LeaveRequest[] {
  if (viewer.role === 'admin') return requests;
  const reports = new Set(users.filter((u) => u.managerId === viewer.id).map((u) => u.id));
  return requests.filter((r) => r.employeeId === viewer.id || reports.has(r.employeeId));
}

export function createRequest(
  owner: User,
  input: Pick<LeaveRequest, 'type' | 'startDate' | 'endDate' | 'reason'>,
): LeaveRequest {
  const request: LeaveRequest = {
    id: nextId++,
    employeeId: owner.id,
    employeeName: owner.name,
    ...input,
    status: 'pending',
    decidedBy: null,
  };
  requests.push(request);
  return request;
}

export function findRequest(id: number): LeaveRequest | undefined {
  return requests.find((r) => r.id === id);
}

export function canDecide(viewer: User, request: LeaveRequest): boolean {
  if (request.employeeId === viewer.id) return false;
  if (viewer.role === 'admin') return true;
  const owner = users.find((u) => u.id === request.employeeId);
  return viewer.role === 'manager' && owner?.managerId === viewer.id;
}

export function reset(): void {
  requests = [];
  nextId = 1;
}
