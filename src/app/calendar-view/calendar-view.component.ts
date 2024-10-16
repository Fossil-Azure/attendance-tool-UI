/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectorRef, Component } from '@angular/core';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format } from 'date-fns';
import * as moment from 'moment';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { LoaderService } from 'src/service/Loader/loader.service';

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

  constructor(private loader: LoaderService, private api: ApiCallingService, private cdr: ChangeDetectorRef) { }

  async ngOnInit() {
    this.loader.show();
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
        this.generateCalendar(this.selectedYear, this.selectedMonth);
      });
    }
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
    const startDate = startOfWeek(startOfMonth(new Date(year, month)), { weekStartsOn: 0 });
    const endDate = endOfWeek(endOfMonth(new Date(year, month)), { weekStartsOn: 0 });
    const days = [];
    let day = startDate;

    const formatDateForDB = (date: Date) => format(date, 'dd-MMMM-yyyy');

    if (!this.attendanceData || !Array.isArray(this.attendanceData)) {
      console.error('Attendance data is not available or not an array');
      return;
    }

    while (day <= endDate) {
      const formattedDate = formatDateForDB(day);
      const attendanceRecord = this.attendanceData.find(
        (record) => record.date === formattedDate
      );

      days.push({
        date: day,
        formattedDate,
        displayDate: day.getDate(),
        attendance: attendanceRecord ? attendanceRecord.attendance : ''
      });
      day = addDays(day, 1);
    }
    this.daysInMonth = days;
    console.log('Days in Month:', this.daysInMonth);
  }

  generateAttendanceData(): Promise<void> {
    this.loader.show();
    const payload = {
      emailId: this.email,
      year: this.selectedYear,
      month: this.selectedMonth
    };
    return new Promise((resolve) => {
      const observer = {
        next: (data: any[]) => {
          console.log('Fetched Attendance Data:', data);
          this.attendanceData = data;
          this.cdr.detectChanges(); // Force change detection
          this.loader.hide();
          resolve(); // Resolve after data is fetched
        },
        error: (err: any) => {
          console.error('Error fetching Calendar Data', err);
          this.loader.hide();
          resolve(); // Resolve even if there's an error
        }
      };
      this.api.calendarData(payload).subscribe(observer);
    });
  }

  getAttendanceClass(attendance: string): string {
    switch (attendance) {
      case 'Work From Office':
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
      next: (data: string[]) => this.months = data,
      error: (err: any) => console.error('Error fetching distinct months', err),
      complete: () => console.log('Fetching distinct months completed')
    };
    this.api.distinctMonths().subscribe(observer);
  }

  onYearMonthChange(): void {
    this.generateAttendanceData().then(() => {
      this.generateCalendar(this.selectedYear, this.selectedMonth);
    });
  }
}
