/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectorRef, Component } from '@angular/core';
import { startOfMonth, endOfMonth, addDays, format } from 'date-fns';
import moment from 'moment-timezone';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { AttendanceService } from 'src/service/Shared/attendance.service';

@Component({
  selector: 'app-calendar-view',
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.css',
})
export class CalendarViewComponent {
  currentYear!: string;
  currentMonth!: string;
  daysInMonth: any[] = [];
  years: string[] = [];
  months: string[] = [];
  email!: string;
  selectedYear!: string;
  selectedMonth!: string;
  now!: moment.Moment;
  monthNames: { [key: string]: string } = {
    1: 'January',
    2: 'February',
    3: 'March',
    4: 'April',
    5: 'May',
    6: 'June',
    7: 'July',
    8: 'August',
    9: 'September',
    10: 'October',
    11: 'November',
    12: 'December',
  };
  attendanceData: any[] = [];
  approvalData: any[] = [];

  holidays = [
    '02-October-2025',
    '20-October-2025',
    '21-October-2025',
    '25-December-2025',
    '01-January-2026',
    '15-January-2026',
    '26-January-2026',
    '19-March-2026',
    '01-May-2026',
    '28-May-2026',
    '14-September-2026',
    '02-October-2026',
    '21-October-2026',
    '09-November-2026',
    '25-December-2026',
  ];

  constructor(
    private api: ApiCallingService,
    private cdr: ChangeDetectorRef,
    private attendanceService: AttendanceService
  ) { }

  async ngOnInit() {
    const userDataString = sessionStorage.getItem('user');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      this.email = userData.emailId;
      await this.getCurrentYearAndMonth();
      await this.loadDistinctYears();
      await this.loadDistinctMonths();
      this.selectedYear = this.currentYear;
      this.selectedMonth = this.currentMonth;

      this.generateAttendanceData().then(() => {
        this.getPendingApprovalData().then(() => {
          this.generateCalendar(this.selectedYear, this.selectedMonth);
        });
      });
    }
  }

  isFutureDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    console.log('Comparing dates:', targetDate, '>', today, '=', targetDate > today);
    return targetDate > today;
  }

  getCurrentYearAndMonth(): Promise<void> {
    return new Promise((resolve) => {
      this.now = moment.tz('Asia/Kolkata');
      this.currentYear = this.now.format('YYYY');
      this.currentMonth = this.now.format('MM');
      resolve();
    });
  }

  generateCalendar(year: string, month: string): void {
    const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const endDate = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const days = [];

    const leadingEmptyDays = startDate.getDay();
    for (let i = 0; i < leadingEmptyDays; i++) {
      days.push({ empty: true });
    }

    let day = startDate;
    const formatDateForDB = (date: Date) => format(date, 'dd-MMMM-yyyy');

    while (day <= endDate) {
      const formattedDate = formatDateForDB(day);

      const approvalRecord = this.approvalData.find(
        (record) => record.date === formattedDate
      );

      if (approvalRecord) {
        days.push({
          date: day,
          formattedDate,
          displayDate: day.getDate(),
          attendance: 'Pending Approval',
        });
      } else {
        const attendanceRecord = this.attendanceData.find(
          (record) => record.date === formattedDate
        );

        days.push({
          date: day,
          formattedDate,
          displayDate: day.getDate(),
          attendance: attendanceRecord ? attendanceRecord.attendance : '',
          wfa: attendanceRecord ? attendanceRecord.wfhAnywhere : false,
        });
      }

      day = addDays(day, 1);
    }

    this.daysInMonth = days;
    this.cdr.detectChanges();
  }

  generateAttendanceData(): Promise<void> {
    const payload = {
      emailId: this.email,
      year: this.selectedYear,
      month: this.selectedMonth,
    };
    return new Promise((resolve) => {
      const observer = {
        next: (data: any[]) => {
          this.attendanceData = data;
          resolve(); // Resolve after data is fetched
        },
        error: (err: any) => {
          console.error('Error fetching Calendar Data', err);
          resolve(); // Resolve even if there's an error
        },
      };
      this.api.calendarData(payload).subscribe(observer);
    });
  }

  getPendingApprovalData(): Promise<void> {
    const payload = {
      raisedBy: this.email,
      year: this.selectedYear,
      month: this.selectedMonth,
    };
    return new Promise((resolve) => {
      const observer = {
        next: (data: any[]) => {
          this.approvalData = data;
          resolve();
        },
        error: (err: any) => {
          console.error('Error fetching Calendar Data', err);
          resolve();
        },
      };
      this.api.getPendingApprovalReq(payload).subscribe(observer);
    });
  }

  getAttendanceClass(attendance: string, date: Date, wfa: boolean): string {
    const isWeekend = (day: Date) => day.getDay() === 0 || day.getDay() === 6;
    const formattedDate = format(date, 'dd-MMMM-yyyy');

    if (isWeekend(date) && !attendance) {
      return 'weekend';
    } else if (this.holidays.includes(formattedDate) && !attendance) {
      return 'public-holiday';
    } else if (wfa) {
      return 'wfh-anywhere';
    }

    switch (attendance) {
      case 'Work From Office':
      case 'Work From Office - Friday':
        return 'work-from-office';
      case 'Work From Home':
      case 'Work From Home - Friday':
        return 'work-from-home';
      case 'Leave':
        return 'leave';
      case 'Pending Approval':
        return 'pending-approval';
      default:
        return '';
    }
  }

  loadDistinctYears(): Promise<void> {
    return new Promise((resolve) => {
      const observer = {
        next: (data: string[]) => (this.years = data),
        error: (err: any) =>
          console.error('Error fetching distinct years', err),
        complete: () => console.log('Fetching distinct years completed'),
      };
      this.api.distinctYear().subscribe(observer);
      resolve();
    });
  }

  loadDistinctMonths() {
    const observer = {
      next: (data: string[]) => {
        this.months = data.sort((a, b) => parseInt(b) - parseInt(a));
      },
      error: (err: any) => console.error('Error fetching distinct months', err),
      complete: () => console.log('Fetching distinct months completed'),
    };
    this.api.distinctMonths().subscribe(observer);
  }

  onYearMonthChange(): void {
    this.generateAttendanceData().then(() => {
      this.getPendingApprovalData().then(() => {
        this.generateCalendar(this.selectedYear, this.selectedMonth);
      });
    });
  }

  refreshCalendar(selectedUser: string) {
    this.email = selectedUser;
    this.generateAttendanceData().then(() => {
      this.getPendingApprovalData().then(() => {
        this.generateCalendar(this.selectedYear, this.selectedMonth);
      });
    });
  }

  attendanceMarking(date: any) {
    this.attendanceService.triggerPopup(date);
  }

  shouldShowPointer(attendance: string, date: Date): boolean {
    const attendanceClass = this.getAttendanceClass(attendance, date, false);
    return ['', 'weekend', 'public-holiday'].includes(attendanceClass);
  }
}
