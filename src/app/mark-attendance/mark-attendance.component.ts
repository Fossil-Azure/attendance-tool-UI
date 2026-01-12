/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SummaryDialogComponent } from '../summary-dialog/summary-dialog.component';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { LoaderService } from 'src/service/Loader/loader.service';

interface AttendanceSummaryItem {
  date: string;
  attendance: string;
  reason: string;
  approvalRequired: boolean;
}

interface SummaryDialogData {
  summary: AttendanceSummaryItem[];
  anyApprovalsRequired: boolean;
}

export interface AttendanceDialogData {
  defaultShift?: string;
  wfaBalance?: number;
  minDate?: Date;
  maxDate?: Date;
  filteredOptions?: string[];
  shiftOptions?: string[];
  halfDayOptions?: string[];
  permanent: boolean;
  emailId: string;
  managerId: string;
  selectedDates?: Date[];
}

@Component({
  selector: 'app-mark-attendance',
  templateUrl: './mark-attendance.component.html',
  styleUrl: './mark-attendance.component.css',
})
export class MarkAttendanceComponent {
  // form model
  selectedDates: Date[] = [];
  selectedAttendance: string | null = null;
  shift: string | null = null;
  optForWFA = false;
  halfDayFullDay: string = "Full Day";

  // when opened, these are filled from injected data or default values
  defaultShift = 'Shift A';
  wfhAnyWhere: number = 0;
  minDate?: Date;
  maxDate?: Date;
  filteredOptions: string[] = ['Work From Office', 'Work From Home', 'Leave'];
  shiftOptions: string[] = [
    'Shift A',
    'Shift B',
    'Shift C',
    'Shift D',
    'Shift F',
    'Absent',
  ];
  halfDayOptions: string[] = ['Half Day', 'Full Day'];
  currentShiftOptions: string[] = [];
  shiftDisabled: boolean = false;
  holiday = [
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

  exceptionList = [
    'bpatil@fossil.com',
    'dn1@fossil.com',
    'dkv@fossil.com',
    'nrout@fossil.com',
    'pshroff1@fossil.com',
    'srajasekaran1@fossil.com',
    'pgs@fossil.com',
    'sthotapalli@fossil.com',
    'msakmal@fossil.com',
    'vdivakarv@fossil.com',
    'kmshaik@fossil.com',
  ];
  email: string = '';
  permanent: boolean = true;
  managerId: any;
  viewDate = new Date();

  constructor(
    public dialogRef: MatDialogRef<MarkAttendanceComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AttendanceDialogData | null,
    private snack: MatSnackBar, private dialog: MatDialog, private api: ApiCallingService, private loader: LoaderService
  ) {
    if (data) {
      this.defaultShift = data.defaultShift ?? this.defaultShift;
      this.wfhAnyWhere = data.wfaBalance ?? this.wfhAnyWhere;
      this.minDate = data.minDate;
      this.maxDate = data.maxDate;
      this.filteredOptions = data.filteredOptions ?? this.filteredOptions;
      this.shiftOptions = data.shiftOptions ?? this.shiftOptions;
      this.halfDayOptions = data.halfDayOptions ?? this.halfDayOptions;
      this.email = data.emailId;
      this.permanent = data.permanent;
      this.managerId = data.managerId;

      if (data.selectedDates && Array.isArray(data.selectedDates)) {
        this.selectedDates = data.selectedDates.map(d => (d instanceof Date ? d : new Date(d)));
      }
    }
  }

  ngOnInit() {
    this.filteredOptions = [...this.filteredOptions];
    this.currentShiftOptions = [...this.shiftOptions];
    if (this.defaultShift) {
      this.shift = this.defaultShift;
    }
  }

  onDateChange() {
    this.optForWFA = false;
    this.selectedAttendance = null;
    this.shiftDisabled = false;
    this.currentShiftOptions = [...this.shiftOptions];
    this.shift = this.defaultShift ?? this.shiftOptions[0];
  }

  onAttendanceChange(value: string | null) {
    this.optForWFA = false;

    this.selectedAttendance = value;

    if (!value) {
      this.shiftDisabled = false;
      this.currentShiftOptions = [...this.shiftOptions];
      this.shift = this.defaultShift ?? this.shiftOptions[0];
      return;
    }

    if (value === 'Leave') {
      this.shiftDisabled = true;
      this.currentShiftOptions = ['Absent'];
      this.shift = 'Absent';
    } else if (value === 'Work from Home' || value === 'Work From Office') {
      this.shiftDisabled = false;
      this.currentShiftOptions = [...this.shiftOptions];
      if (
        this.shift === 'Absent' ||
        !this.currentShiftOptions.includes(this.shift ?? '')
      ) {
        this.shift = this.defaultShift ?? this.currentShiftOptions[0];
      }
    } else {
      this.shiftDisabled = false;
      this.currentShiftOptions = [...this.shiftOptions];
    }
  }

  onWfaToggleChange(value: boolean) {
    this.optForWFA = value;
    if (!value) {
      this.halfDayFullDay = "Full Day";
    }
  }

  onOptForWFAChange(event: any) {
    if (this.selectedDates.length > this.wfhAnyWhere) {
      this.snack.open(
        `You have only ${this.wfhAnyWhere} WFA days remaining.`,
        'Close',
        { duration: 2000 }
      );
      this.optForWFA = false;
      setTimeout(() => (event.source.checked = false));
      return;
    } else {
      const checked = !!event?.checked;
      this.optForWFA = checked;

      if (checked) {
        this.selectedAttendance = 'Work From Home';
        this.shiftDisabled = false;
        this.currentShiftOptions = [...this.shiftOptions];
        this.shift = this.defaultShift ?? this.currentShiftOptions[0];
      } else {
        this.selectedAttendance = null;
        this.shiftDisabled = false;
        this.currentShiftOptions = [...this.shiftOptions];
        this.shift = this.defaultShift ?? this.currentShiftOptions[0];
      }
    }
  }

  onClose() {
    this.selectedDates = [];
    this.selectedAttendance = null;
    this.optForWFA = false;
    this.halfDayFullDay = "Full Day";
    this.shiftDisabled = false;
    this.currentShiftOptions = [...this.shiftOptions];
    this.shift = this.defaultShift ?? this.shiftOptions[0];
    this.dialogRef.close(null);
  }

  onSave() {
    const summary: AttendanceSummaryItem[] = [];
    for (const d of this.selectedDates) {
      const date = this.toDateOnly(d);
      const dateKey = this.formatDateKey(date);
      const dayName = this.getWeekdayName(date);
      const finalAttendance = this.optForWFA
        ? 'Work From Home'
        : this.selectedAttendance || 'Unmarked';

      const approvals: string[] = [];
      let approvalRequired = false;


      const isFuture = this.isFutureDate(date);
      if (isFuture && finalAttendance !== 'Leave') {
        this.snack.open(
          'For future dates, only Leave can be applied.',
          'Close',
          { duration: 3000 }
        );
        return;
      }

      if ((this.isWeekend(date) || this.holiday.includes(dateKey)) && this.selectedAttendance !== 'Leave') {
        approvals.push('Attendance on weekends/holidays');
        approvalRequired = true;
      } else {
        this.snack.open(
          'Leave on weekend or Holiday?',
          'Close',
          { duration: 3000 }
        );
        return;
      }

      if (finalAttendance === 'Work From Home') {
        const isMonThu = this.isMonToThu(date);
        const isExceptionUser = this.exceptionList.includes(
          this.email?.toLowerCase()
        );
        if (isMonThu && !isExceptionUser) {
          approvals.push('WFH on Mon–Thu');
          approvalRequired = true;
        }
      }

      if (this.optForWFA) {
        approvals.push('Opted for WFA');
        approvalRequired = true;
      }

      if ((this.shift && this.defaultShift && this.shift !== this.defaultShift) && this.selectedAttendance !== 'Leave') {
        approvals.push(
          `Shift change (${this.defaultShift} → ${this.shift})`
        );
        approvalRequired = true;
      }

      const reason = approvals.length
        ? approvals.join('; ')
        : 'No approval required';

      summary.push({
        date: `${dateKey} (${dayName})`,
        attendance: finalAttendance,
        reason,
        approvalRequired,
      });
    }

    const anyApprovalsRequired = summary.some((s) => s.approvalRequired);

    const dialogRef = this.dialog.open(SummaryDialogComponent, {
      width: '820px',
      maxWidth: '95vw',
      data: {
        summary,
        anyApprovalsRequired,
      } as SummaryDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.confirmed) {
        this.performSave(summary);
      } else {
        // user cancelled the final save
      }
    });
  }

  isFutureDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return checkDate > today;
  }


  private performSave(summary: AttendanceSummaryItem[]) {
    this.loader.show()
    const normalizeAttendance = (label: string): 'WFO' | 'WFH' | 'Leave' | 'Unmarked' => {
      if (!label) return 'Unmarked';
      const l = label.trim().toLowerCase();
      if (l === 'wfh' || l === 'work from home') return 'WFH';
      if (l === 'wfo' || l === 'work from office') return 'WFO';
      if (l === 'leave') return 'Leave';
      return 'Unmarked';
    };

    const computeAllowances = (
      isPermanent: boolean,
      attendance: 'WFO' | 'WFH' | 'Leave' | 'Unmarked',
      shiftForItem: string | null
    ) => {
      let foodAllowance = 0;
      let allowance = 0;
      if (!isPermanent) return { allowance: 0, foodAllowance: 0 };

      if (attendance === 'WFO') {
        foodAllowance = !shiftForItem || shiftForItem === 'Shift A' ? 75 : 100;
      } else {
        foodAllowance = 0;
      }

      switch (shiftForItem) {
        case 'Shift A': allowance = 0; break;
        case 'Shift B': allowance = 150; break;
        case 'Shift C':
        case 'Shift F': allowance = 250; break;
        case 'Shift D': allowance = 350; break;
        default: allowance = 0;
      }

      return { allowance, foodAllowance };
    };

    const buildApprovalPayload = (s: AttendanceSummaryItem, shiftForItem: string | null) => {
      const { year, quarter, month } = this.extractYearQuarterMonth(s.date);

      return {
        name: this.email || '',
        comments: s.reason || '',
        date: this.formatPrettyDate(s.date),
        month,
        newAttendance: s.attendance,
        newShift: shiftForItem ?? '',
        prevAttendance: 'Unmarked',
        prevShift: this.defaultShift ?? '',
        quarter,
        raisedBy: this.email ?? '',
        raisedTo: this.managerId,
        status: 'Pending',
        type: 'AttendanceChange',
        year,
        permanent: this.permanent,
        halfDayFullDay: this.halfDayFullDay ?? 'Full Day',
      };
    };

    const approvalCalls: any[] = [];
    const saveCalls: any[] = [];

    for (const s of summary) {
      const attendanceNormalized = normalizeAttendance(s.attendance);
      const { year, quarter, month } = this.extractYearQuarterMonth(s.date);
      const shiftForItem = (s as any).shift ?? this.shift ?? null;
      const { allowance, foodAllowance } = computeAllowances(this.permanent, attendanceNormalized, shiftForItem);

      if (s.approvalRequired) {
        const approvalPayload = buildApprovalPayload(s, shiftForItem);
        approvalCalls.push(
          this.api.sendForApproval(approvalPayload).pipe(
            catchError(err => of({ __error: true, error: err, date: s.date, type: 'approval' }))
          )
        );
      } else {
        saveCalls.push(
          this.api.attendance(
            this.email, this.email, this.formatPrettyDate(s.date),
            s.attendance, year, quarter, month,
            this.email, "", shiftForItem,
            allowance, foodAllowance,
            this.optForWFA, this.halfDayFullDay
          ).pipe(
            catchError(err => of({ __error: true, error: err, date: s.date, type: 'save' }))
          )
        );
      }
    }

    const allCalls = [...approvalCalls, ...saveCalls];

    if (allCalls.length === 0) {
      this.snack.open('Nothing to save.', 'Close', { duration: 2000 });
      return;
    }

    this.loader.show();

    forkJoin(allCalls).pipe(
      finalize(() => this.loader.hide())
    ).subscribe({
      next: (results: any[]) => {
        const errors = results.filter(r => r && r.__error);
        const total = results.length;
        const failed = errors.length;
        const succeeded = total - failed;

        if (failed === 0) {
          this.snack.open('All items processed successfully', 'Close', { duration: 2500 });
          this.resetFormState();
          this.dialogRef.close({ saved: true });
        } else {
          this.snack.open(`${succeeded} / ${total} items processed. Some items failed.`, 'Close', { duration: 4500 });
          console.error('Failed items:', errors);
        }
      },
      error: (err) => {
        console.error('Unexpected error combining calls', err);
        this.snack.open('Error processing requests. Please try again.', 'Close', { duration: 3500 });
      }
    });
  }

  private extractYearQuarterMonth(dateString: string) {
    const raw = dateString.split(' ')[0];
    const [year, month] = raw.split('-').map(Number);

    // Quarter calculation
    const quarter = `Q${Math.ceil(month / 3)}`;

    return {
      year: String(year),
      quarter,
      month: String(month).padStart(2, '0')
    };
  }

  /** Convert Date or string input into Date at midnight (local) */
  private toDateOnly(d: Date | string): Date {
    const date = new Date(d);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatPrettyDate(dateString: string): string {
    const raw = dateString.split(' ')[0];
    const [year, month, day] = raw.split('-').map(Number);
    const dayStr = String(day).padStart(2, '0');
    return `${dayStr}-${this.fullMonthName(month)}-${year}`;
  }

  private fullMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }


  /** Format date as YYYY-MM-DD for keys & display */
  private formatDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private getWeekdayName(d: Date): string {
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }

  private isWeekend(d: Date): boolean {
    const day = d.getDay();
    return day === 0 || day === 6;
  }

  private isMonToThu(d: Date): boolean {
    const day = d.getDay();
    return day >= 1 && day <= 4;
  }

  private resetFormState(): void {
    this.selectedDates = [];
    this.selectedAttendance = null;
    this.optForWFA = false;
    this.halfDayFullDay = "Full Day";
    this.shiftDisabled = false;
    this.currentShiftOptions = [...this.shiftOptions];
    this.shift = this.defaultShift ?? this.shiftOptions[0];
  }

}
