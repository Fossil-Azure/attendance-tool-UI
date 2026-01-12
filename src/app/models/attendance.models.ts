// src/app/models/attendance.models.ts
export type AttendanceStatus = 'office' | 'home' | 'leave' | 'unmarked' | 'Holiday' | 'Pending';

export interface ApiAttendance {
  id: string;
  emailId: string;
  date: string;
  attendance: string;
  year: string;
  quarter: string;
  month: string;
  shift: string;
  allowance: number;
  foodAllowance: number;
  halfDayOrFullDay: string;
  lastUpdatedBy: string;
  lastUpdatedOn: string;
  wfhAnywhere: boolean;
}

export interface DayCell {
  date: Date;
  inCurrentMonth: boolean;
  status: AttendanceStatus;
  wfaStatus?: boolean;
  approvalPending?: boolean;
  shift?: 'Shift A' | 'Shift B' | 'Shift C' | 'Shift D' | 'Shift E' | 'Absent' | 'Holiday' | 'Pending';
}
