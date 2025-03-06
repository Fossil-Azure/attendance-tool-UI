/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectorRef, Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { startOfMonth, endOfMonth, addDays, format } from 'date-fns';
import moment from 'moment-timezone';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { AttendanceService } from 'src/service/Shared/attendance.service';

@Component({
  selector: 'app-calendar-view',
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.css'
})
export class CalendarViewComponent {
  currentYear!: number;
  currentMonth!: number;
  daysInMonth: any[] = [];
  years: string[] = [];
  months: string[] = [];
  email!: string;
  selectedYear!: number;
  selectedMonth!: number;
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
    12: 'December'
  };
  attendanceData: any[] = [];
  approvalData: any[] = [];

  holidays = ['02-October-2024', '31-October-2024', '01-November-2024', '25-December-2024', '01-January-2025', '14-January-2025', '7-March-2025', '14-March-2025', '31-March-2025', '01-May-2025', '15-August-2025', '27-August-2025', '02-October-2025', '20-October-2025', '21-October-2025', '25-December-2025'];

  constructor(private api: ApiCallingService, private cdr: ChangeDetectorRef, private dialog: MatDialog, private attendanceService: AttendanceService) { }

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
        })
      });
    }
  }

  isFutureDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of the day for comparison
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0); // Reset time for the target date
    return targetDate > today;
  }

  getCurrentYearAndMonth(): Promise<void> {
    return new Promise((resolve) => {
      this.now = moment.tz('Asia/Kolkata');
      this.currentYear = this.now.year();
      this.currentMonth = this.now.month() + 1;
      resolve();
    });
  }

  generateCalendar(year: number, month: number): void {
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    const days = [];

    // Calculate the leading empty days for alignment
    const leadingEmptyDays = startDate.getDay(); // 0 for Sunday, 1 for Monday, etc.
    for (let i = 0; i < leadingEmptyDays; i++) {
      days.push({ empty: true });
    }

    let day = startDate;
    const formatDateForDB = (date: Date) => format(date, 'dd-MMMM-yyyy');

    while (day <= endDate) {
      const formattedDate = formatDateForDB(day);

      // Check if the date is in the approvalData array
      const approvalRecord = this.approvalData.find(
        (record) => record.date === formattedDate
      );

      // If the date exists in approvalData, set attendance to 'Pending Approval'
      if (approvalRecord) {
        days.push({
          date: day,
          formattedDate,
          displayDate: day.getDate(),
          attendance: 'Pending Approval'
        });
      } else {
        // Otherwise, check the attendance data
        const attendanceRecord = this.attendanceData.find(
          (record) => record.date === formattedDate
        );

        days.push({
          date: day,
          formattedDate,
          displayDate: day.getDate(),
          attendance: attendanceRecord ? attendanceRecord.attendance : ''
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
      month: this.selectedMonth
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
        }
      };
      this.api.calendarData(payload).subscribe(observer);
    });
  }

  getPendingApprovalData(): Promise<void> {
    const payload = {
      raisedBy: this.email,
      year: this.selectedYear,
      month: this.selectedMonth
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
        }
      };
      this.api.getPendingApprovalReq(payload).subscribe(observer);
    });
  }

  getAttendanceClass(attendance: string, date: Date): string {
    const isWeekend = (day: Date) => day.getDay() === 0 || day.getDay() === 6;
    const formattedDate = format(date, 'dd-MMMM-yyyy');

    if ((isWeekend(date)) && !attendance) {
      return 'weekend';
    } else if ((this.holidays.includes(formattedDate)) && !attendance) {
      return 'public-holiday'
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
        next: (data: string[]) => this.years = data,
        error: (err: any) => console.error('Error fetching distinct years', err),
        complete: () => console.log('Fetching distinct years completed')
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
      complete: () => console.log('Fetching distinct months completed')
    };
    this.api.distinctMonths().subscribe(observer);
  }

  onYearMonthChange(): void {
    this.generateAttendanceData().then(() => {
      this.getPendingApprovalData().then(() => {
        this.generateCalendar(this.selectedYear, this.selectedMonth);
      })
    });
  }

  refreshCalendar(selectedUser: string) {
    this.email = selectedUser
    this.generateAttendanceData().then(() => {
      this.getPendingApprovalData().then(() => {
        this.generateCalendar(this.selectedYear, this.selectedMonth);
      })
    });
  }

  attendanceMarking(date: any) {
    this.attendanceService.triggerPopup(date);
  }

  shouldShowPointer(attendance: string, date: Date): boolean {
    const attendanceClass = this.getAttendanceClass(attendance, date);
    return ['', 'weekend', 'public-holiday'].includes(attendanceClass);
  }

}
