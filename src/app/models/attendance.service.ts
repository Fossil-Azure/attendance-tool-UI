/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { AttendanceStatus } from '../models/attendance.models';
import { parseApiDate, fmtKey } from '../models/date-utils';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly baseUrl = '/api/attendance';

  constructor(private http: HttpClient) {}

  // Map API attendance string to status
  private toStatus(s: string): AttendanceStatus {
    const x = s?.toLowerCase() ?? '';
    if (x.includes('work from office')) return 'office';
    if (x.includes('work from home')) return 'home';
    if (x.includes('leave')) return 'leave';
    return 'unmarked';
  }

  private toShiftLetter(
    shift: string | undefined
  ):
    | 'Shift A'
    | 'Shift B'
    | 'Shift C'
    | 'Shift D'
    | 'Shift E'
    | 'Absent'
    | undefined {
    const m = /shift\s+([A-E])/i.exec(shift ?? '');
    return m ? (`Shift ${m[1].toUpperCase()}` as any) : undefined;
  }

  getMonth(data: any) {
    return data.pipe(
        map((list: any[]) => {
          const mapObj: Record<
            string,
            { status: AttendanceStatus; shift?: 'A' | 'B' | 'C' | 'D' | 'E' }
          > = {};

          list.forEach((item) => {
            const dateObj = parseApiDate(item.date);
            const key = fmtKey(dateObj);

            let status: AttendanceStatus;
            const a = item.attendance.toLowerCase();
            if (a.includes('work from office')) status = 'office';
            else if (a.includes('work from home')) status = 'home';
            else if (a.includes('leave')) status = 'leave';
            else status = 'unmarked';

            const shiftMatch = /shift\s+([A-E])/i.exec(item.shift ?? '');
            const shift = shiftMatch
              ? (shiftMatch[1].toUpperCase() as any)
              : undefined;

            mapObj[key] = { status, shift };
          });

          return mapObj;
        })
      );
  }

  /** Save/Update a single day (call your backend) */
  upsertDay(
    date: Date,
    status: AttendanceStatus,
    shift?: 'A' | 'B' | 'C' | 'D' | 'E'
  ): Observable<void> {
    // Post body your API expects
    const body = {
      date,
      status,
      shift,
    };
    return this.http.post<void>(`${this.baseUrl}`, body);
  }

  /** Remove/reset a day */
  clearDay(date: Date): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}?date=${fmtKey(date)}`);
  }
}
