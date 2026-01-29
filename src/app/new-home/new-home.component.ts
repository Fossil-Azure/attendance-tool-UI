/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { AttendanceStatus, DayCell } from '../models/attendance.models';
import { fmtKey, parseApiDate } from '../models/date-utils';
import { forkJoin, switchMap } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import { LegendPosition } from '@swimlane/ngx-charts';
import {
  AttendanceDialogData,
  MarkAttendanceComponent,
} from '../mark-attendance/mark-attendance.component';
import { LoaderService } from 'src/service/Loader/loader.service';

interface MonthStats {
  leaves: number;
  wfo: number;
  wfh: number;
  wfa: number;
  pending: number;
}

interface MonthMapEntry {
  status?: string;
  wfa?: boolean;
  wfhAnywhere?: boolean;
  shift?: string | undefined;
  approvalPending?: boolean | string | number;
}

@Component({
  selector: 'app-new-home',
  templateUrl: './new-home.component.html',
  styleUrls: ['./new-home.component.css'],
})
export class NewHomeComponent implements OnInit {

  viewDate = new Date(); // current month
  weeks: DayCell[][] = [];
  loading = false;
  monthMap: Record<
    string,
    {
      wfa: boolean;
      status: AttendanceStatus | string;
      shift?:
      | 'Shift A'
      | 'Shift B'
      | 'Shift C'
      | 'Shift D'
      | 'Shift E'
      | 'Absent'
      | 'Holiday'
      | undefined;
      approvalPending?: boolean;
      requestType?: string;
      requestStatus?: string;
    }
  > = {};

  email: string = '';
  LegendPosition = LegendPosition;

  holidays = [
    '2025-10-02',
    '2025-10-20',
    '2025-10-21',
    '2025-12-25',
    '2026-01-01',
    '2026-01-15',
    '2026-01-26',
    '2026-03-19',
    '2026-05-01',
    '2026-05-28',
    '2026-09-14',
    '2026-10-02',
    '2026-10-21',
    '2026-11-09',
    '2026-12-25',
  ];

  private shiftRates: Record<string, number> = {
    'Shift A': 0,
    'Shift B': 150,
    'Shift C': 250,
    'Shift D': 350,
    'Shift F': 250,
  };

  pieData: any[] = [];
  colorScheme: Color = {
    name: 'attendance',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#2979FF', '#1E8E6A', '#5E35B1', '#E53935', '#FB8C00'],
  };

  counts: MonthStats = { leaves: 0, wfo: 0, wfh: 0, wfa: 0, pending: 0 };
  shiftAllowance = 0;

  private holidaySet = new Set<string>();
  permanent: any;
  private readonly DAY_MS = 24 * 60 * 60 * 1000;
  defaultShift: any;
  wfhAnyWhere: any;
  managerId: any;
  subOrdinateList: any[] = [];
  selectedEmail: any;

  constructor(
    private api: ApiCallingService,
    private dialog: MatDialog,
    private loader: LoaderService
  ) { }

  ngOnInit(): void {
    this.holidaySet = new Set(this.holidays);
    const userDataString = sessionStorage.getItem('user');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      this.email = userData.emailId;
      this.selectedEmail = this.email;
      this.permanent = userData.permanent;
      this.defaultShift = userData.shift;
      this.managerId = userData.managerId;
    }
    this.load(this.email);
  }

  get monthLabel(): string {
    return this.viewDate.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }

  prev(): void {
    this.viewDate = new Date(
      this.viewDate.getFullYear(),
      this.viewDate.getMonth() - 1,
      1
    );
    this.load(this.selectedEmail);
  }

  next(): void {
    this.viewDate = new Date(
      this.viewDate.getFullYear(),
      this.viewDate.getMonth() + 1,
      1
    );
    this.load(this.selectedEmail);
  }

  private buildGrid(): void {
    const y = this.viewDate.getFullYear();
    const m = this.viewDate.getMonth();

    const first = new Date(y, m, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const startMs = start.getTime();
    this.weeks = [];
    this.computeMonthStats();

    for (let w = 0; w < 6; w++) {
      const row: DayCell[] = new Array(7);
      for (let d = 0; d < 7; d++) {
        const currentMs = startMs + (w * 7 + d) * this.DAY_MS;
        const date = new Date(currentMs);
        const key = fmtKey(date);
        const inCurrentMonth = date.getMonth() === m;
        const mapped = this.monthMap[key];
        const status = (
          mapped?.approvalPending === true
            ? 'Pending'
            : mapped?.status ??
            (this.holidaySet.has(key) ? 'Holiday' : 'unmarked')
        ) as AttendanceStatus;

        const wfaStatus = !!mapped?.wfa;

        row[d] = {
          date,
          inCurrentMonth,
          status,
          wfaStatus,
          shift: mapped?.shift,
          approvalPending: !!mapped?.approvalPending,
        };
      }
      this.weeks.push(row);
    }
    this.calculateShiftAllowance();
  }

  private calculateShiftAllowance(): void {
    if (!this.permanent) {
      this.shiftAllowance = 0;
      return;
    }

    const rates = this.shiftRates;
    const weeks = this.weeks;
    let total = 0;

    for (let i = 0, lenW = weeks.length; i < lenW; i++) {
      const row = weeks[i];
      for (let j = 0, lenD = row.length; j < lenD; j++) {
        const day = row[j];
        if (!day.inCurrentMonth) continue;
        if (day.status === 'Pending') continue;
        const status = (day.status || '').toString().toLowerCase();
        if (status !== 'office' && status !== 'home') continue;

        const shift = day.shift ?? '';
        const baseRate = rates[shift] ?? 0;

        const additional =
          status === 'office' ? (shift === 'Shift A' ? 75 : 100) : 0;

        total += baseRate + additional;
      }
    }
    this.shiftAllowance = Math.round(total * 100) / 100;
  }

  private load(emailId: string): void {
    console.log(emailId)
    this.loading = true;
    this.loader.show();

    const payload = {
      emailId: emailId || this.email,
      year: this.viewDate.getFullYear(),
      month: String(this.viewDate.getMonth() + 1).padStart(2, '0'),
    };

    const payload2 = {
      raisedBy: this.email,
      raisedTo: this.email,
    };

    forkJoin({
      calendar: this.api.calendarData(payload),
      requests: this.api.requestApproval(payload2),
      subOrdinates: this.api.getListofSubOrdinates(this.email),
    }).pipe(
      finalize(() => {
        // always run on complete/error
        this.loading = false;
        this.loader.hide();
      })
    ).subscribe({
      next: ({ calendar, requests, subOrdinates }) => {
        const mapObj: Record<string, {
          wfa: boolean;
          status: AttendanceStatus | string;
          shift?: 'Shift A' | 'Shift B' | 'Shift C' | 'Shift D' | 'Shift E' | 'Absent' | 'Holiday' | undefined;
          approvalPending?: boolean;
          requestType?: string;
          requestStatus?: string;
        }> = {};

        (calendar || []).forEach((item: any) => {
          const dateObj = parseApiDate(item.date);
          const key = fmtKey(dateObj);
          const rawAtt = (item.attendance || '').toString().toLowerCase();

          let status: AttendanceStatus | string;
          if (rawAtt.includes('work from office')) status = 'office';
          else if (rawAtt.includes('work from home')) status = 'home';
          else if (rawAtt.includes('leave')) status = 'leave';
          else if (this.holidaySet.has(key)) status = 'Holiday';
          else status = 'unmarked';

          const wfa = !!item.wfhAnywhere;

          let shift:
            | 'Shift A'
            | 'Shift B'
            | 'Shift C'
            | 'Shift D'
            | 'Shift E'
            | 'Absent'
            | 'Holiday'
            | undefined;

          if (rawAtt.includes('leave')) shift = 'Absent';
          else if (rawAtt.includes('holiday')) shift = 'Holiday';
          else {
            const match = /shift\s+([A-EF])/i.exec(item.shift ?? '');
            shift = match ? (`Shift ${match[1]}` as any) : undefined;
            if (!shift && item.shift && /shift\s+F/i.test(item.shift)) shift = 'Shift F' as any;
          }

          mapObj[key] = { wfa, status, shift, approvalPending: false };
        });

        ((requests?.raisedByList || []) as any[]).forEach((req: any) => {
          const dateObj = parseApiDate(req.date);
          const key = fmtKey(dateObj);
          const approvalPending = (req.status || '').toString().toLowerCase() === 'pending';

          if (mapObj[key]) {
            mapObj[key].requestType = req.requestType;
            mapObj[key].requestStatus = req.status;
            mapObj[key].approvalPending = approvalPending;
          } else {
            mapObj[key] = {
              wfa: false,
              status: 'unmarked',
              requestType: req.requestType,
              requestStatus: req.status,
              approvalPending,
            };
          }
        });

        this.subOrdinateList = (subOrdinates as any[] || [])
          .sort((a: any, b: any) => a.name.localeCompare(b.name));

        this.monthMap = mapObj;
        this.buildGrid();
      },
      error: () => {
        this.monthMap = {};
        this.buildGrid();
      },
    });
  }


  computeMonthStats(): void {
    const counts: MonthStats = {
      leaves: 0,
      wfo: 0,
      wfh: 0,
      wfa: 0,
      pending: 0,
    };

    if (!this.monthMap || typeof this.monthMap !== 'object') {
      this.counts = counts;
      return;
    }

    const selectedYear = this.viewDate.getFullYear();
    const selectedMonth = this.viewDate.getMonth() + 1;

    for (const key of Object.keys(this.monthMap)) {
      const m: MonthMapEntry = this.monthMap[key] || {};
      if (!m) continue;

      const [yearStr, monthStr] = key.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);

      if (year !== selectedYear || month !== selectedMonth) continue;

      const isPending = m.approvalPending === true;
      if (isPending) {
        counts.pending++;
        continue;
      }

      const status = (m.status || '').toString().toLowerCase();
      if (status === 'leave') {
        counts.leaves++;
      } else if (status === 'office') {
        counts.wfo++;
      } else if (status === 'home') {
        if (m.wfa === true || String(m.wfa).toLowerCase() === 'true') {
          counts.wfa++;
        } else {
          counts.wfh++;
        }
      }
    }

    this.counts = counts;
    this.updatePieData();
  }

  updatePieData(): void {
    this.pieData = [
      { name: 'WFO', value: this.counts.wfo },
      { name: 'WFH', value: this.counts.wfh },
      { name: 'WFA', value: this.counts.wfa },
      { name: 'Leaves', value: this.counts.leaves },
      { name: 'Pending', value: this.counts.pending },
    ];
  }

  get totalDays(): number {
    return (
      this.counts.wfo +
      this.counts.wfh +
      this.counts.wfa +
      this.counts.leaves +
      this.counts.pending
    );
  }

  openAttendanceDialog(selectedDate?: Date | Date[]) {
    this.api
      .searchUserByEmail(this.email)
      .pipe(
        switchMap((response) => {
          this.permanent = response[0].permanent;
          this.wfhAnyWhere = response[0].wfhAnyWhere;

          const today = new Date();
          const minDate = new Date(today);
          minDate.setMonth(minDate.getMonth() - 1);
          minDate.setDate(1);

          const maxDate = new Date(today);
          maxDate.setMonth(maxDate.getMonth() + 2);
          maxDate.setDate(0);
          maxDate.setHours(23, 59, 59, 999);

          const data: AttendanceDialogData = {
            defaultShift: this.defaultShift,
            wfaBalance: this.wfhAnyWhere,
            minDate,
            maxDate,
            permanent: this.permanent,
            shiftOptions: [
              'Shift A',
              'Shift B',
              'Shift C',
              'Shift D',
              'Shift F',
            ],
            halfDayOptions: ['Half Day', 'Full Day'],
            emailId: this.email,
            managerId: this.managerId,
            selectedDates: Array.isArray(selectedDate) ? selectedDate : (selectedDate ? [selectedDate] : undefined)
          };

          return this.dialog
            .open(MarkAttendanceComponent, {
              width: '920px',
              maxWidth: '95vw',
              panelClass: 'attendance-dialog-panel',
              data,
            })
            .afterClosed();
        })
      )
      .subscribe((result) => {
        if (result?.saved) {
          this.load(this.email);
        }
      });
  }

  onDayClick(date: Date, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.openAttendanceDialog(date);
  }

  refreshData(emailId: string) {
    this.load(emailId);
  }
}
