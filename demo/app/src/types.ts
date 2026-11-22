export type Role = 'employee' | 'manager' | 'admin';
export type LeaveType = 'annual' | 'sick' | 'unpaid';

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
  status: 'pending' | 'approved' | 'rejected';
  decidedBy: string | null;
}

export interface NewLeaveRequest {
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}
