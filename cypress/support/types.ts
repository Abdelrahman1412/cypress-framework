export const ROLES = ['employee', 'manager', 'admin'] as const;
export type Role = (typeof ROLES)[number];
export type LeaveType = 'annual' | 'sick' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type ApiMode = 'mock' | 'live';

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

export type NewLeaveRequest = Pick<LeaveRequest, 'type' | 'startDate' | 'endDate' | 'reason'>;

export interface Credentials {
  email: string;
  password: string;
}

/** Where the app keeps its session token. Change this when plugging in another app. */
export const TOKEN_KEY = 'acme.token';
