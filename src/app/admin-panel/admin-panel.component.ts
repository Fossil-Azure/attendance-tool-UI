/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { LoaderService } from 'src/service/Loader/loader.service';
import moment from 'moment-timezone';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.css',
})
export class AdminPanelComponent {
  username: string = '';
  emailId: string = '';
  team: string = '';
  now!: moment.Moment;
  currentQuarter: number = 0;
  currentYear: number = 0;
  time: string = '';
  attendanceData: any;
  lastlogin: any;
  distinctYears: string[] = [];
  distinctQuarters: string[] = [];
  selectedYear: string = '';
  selectedQuarter: string = '';
  selectedMonth: any;
  reportData: any[] = [];
  readonly EXCEL_TYPE =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
  readonly EXCEL_EXTENSION = '.xlsx';
  mergedArray: any[] = [];
  distinctMonths: number[] = [];
  selectedRadio: string = '1';
  currentMonth: number = 0;
  readonly monthNames: { [key: number]: string } = {
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
  detailedArray: any[] = [];
  daysInMonth: number[] = [];
  todaysAttendanceData: any[] = [];
  qtrAttendanceData: any[] = [];
  wfo: number = 0;
  wfoList: any[] = [];
  wfh: number = 0;
  wfhList: any[] = [];
  leave: number = 0;
  leaveList: any[] = [];
  notMarkedList: any[] = [];
  reporteeList: any[] = [];
  reportType: string = '';
  popUpList: any[] = [];
  upcomingLeaveList: any[] = [];

  constructor(
    private api: ApiCallingService,
    private loader: LoaderService,
    private dialog: MatDialog,
    private router: Router
  ) {}
  users: any[] = [];
  attendanceReportData: any = [];

  @ViewChild('userDetails') userDetailsPopup!: TemplateRef<any>;
  @ViewChild('downloadAttendanceReport')
  downloadAttendanceReportPopup!: TemplateRef<any>;
  @ViewChild('downloadShiftReport') downloadShiftReportPopup!: TemplateRef<any>;
  @ViewChild('usersReport') userReportPopup!: TemplateRef<any>;
  @ViewChild('usersReport2') userReportPopup2!: TemplateRef<any>;

  sortedColumn: string = 'wfh';
  sortAscending: boolean = true;
  dialogRef1!: MatDialogRef<any>;
  dialogRef!: MatDialogRef<any>;

  async ngOnInit() {
    this.loader.show();
    await this.getCurrentQuarterAndYear();
    await this.loadDistinctYears();
    await this.loadDistinctQuarters();
    await this.getDistinctMonths();
    this.upcomingLeaves();
    const userDataString = sessionStorage.getItem('user');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      this.emailId = userData.emailId;
    }
    const auth = sessionStorage.getItem('Admin');
    if (auth !== 'true') {
      this.router.navigateByUrl('/');
    }
    this.selectedYear = this.currentYear.toString();
    this.selectedQuarter = 'Q' + this.currentQuarter;
    this.selectedMonth = this.currentMonth;
    this.getData();
  }

  getData() {
    this.loader.show();
    this.api
      .downloadMonthlyAdminReport(this.selectedMonth, this.selectedYear)
      .subscribe({
        next: (attendanceResponse) => {
          if (attendanceResponse) {
            this.attendanceReportData = attendanceResponse;
          }
          this.api.getListofSubOrdinates(this.emailId).subscribe({
            next: (subordinateResponse) => {
              this.detailedArray = (subordinateResponse as any[]) || [];
              this.getQuarterlyAttendance();
              this.getTodaysAttendance();
              this.loader.hide();
            },
            error: (error) => {
              console.error('Error fetching subordinates list:', error);
              this.loader.hide();
            },
          });
        },
        error: (error) => {
          console.error('Error fetching attendance report:', error);
          this.loader.hide();
        },
      });
  }

  private getTodaysAttendance() {
    this.loader.show();
    const emailIds: string[] = this.detailedArray.map(
      (element: any) => element.emailId
    );
    const time = moment.tz('Asia/Kolkata');
    const date = time.format('DD-MMMM-YYYY');
    this.wfh = 0;
    this.wfo = 0;
    this.leave = 0;
    this.wfhList = [];
    this.wfoList = [];
    this.leaveList = [];
    this.notMarkedList = [];
    this.api.getTodaysAttendance(emailIds, date).subscribe({
      next: (attendance) => {
        this.todaysAttendanceData = attendance;
        attendance.forEach((att: any) => {
          if (
            att.attendance === 'Work From Home' ||
            att.attendance === 'Work From Home - Friday'
          ) {
            this.wfhList.push(att);
            this.wfh++;
          } else if (
            att.attendance === 'Work From Office' ||
            att.attendance === 'Work From Office - Friday'
          ) {
            this.wfoList.push(att);
            this.wfo++;
          } else if (att.attendance === 'Leave') {
            this.leaveList.push(att);
            this.leave++;
          }
        });
        this.loader.hide();
      },
      error: (error) => {
        console.error('Error fetching subordinates list:', error);
        this.loader.hide();
      },
    });
  }

  private getQuarterlyAttendance() {
    this.loader.show();
    this.reporteeList = [];
    const emailIds: string[] = this.detailedArray.map(
      (element: any) => element.emailId
    );
    this.api
      .getQtrAttendance(
        emailIds,
        this.currentYear.toString(),
        'Q' + this.currentQuarter
      )
      .subscribe({
        next: (response) => {
          if (response) {
            this.qtrAttendanceData = response;
            this.mergedArray = this.detailedArray.map((user: any) => {
              const report =
                this.qtrAttendanceData.find(
                  (report: any) => report.emailId === user.emailId
                ) || {};
              const upcomingLeave =
                this.upcomingLeaveList.find(
                  (leave: any) => leave.emailId === user.emailId
                ) || {};
              const defaultValues = {
                wfh: 0,
                wfo: 0,
                wfhFriday: 0,
                wfoFriday: 0,
                leaves: 0,
                holidays: 0,
                reporteeName: user.name,
                upcomingLeaveDates: upcomingLeave.upcomingLeaveDates || '',
              };
              return { ...defaultValues, ...user, ...report };
            });
            this.reporteeList = this.mergedArray;
          }
          this.loader.hide();
        },
        error: () => {
          this.loader.hide();
        },
      });
  }

  private getCurrentQuarterAndYear(): void {
    this.now = moment.tz('Asia/Kolkata');
    this.currentQuarter = this.now.quarter();
    this.currentYear = this.now.year();
    this.currentMonth = this.now.month() + 1;
    this.time = this.now.format('DD-MMMM-YYYY HH:mm:ss');
  }

  private loadDistinctYears(): void {
    this.api.distinctYear().subscribe({
      next: (data: string[]) => (this.distinctYears = data),
      error: (err: any) => console.error('Error fetching distinct years', err),
    });
  }

  private loadDistinctQuarters(): void {
    this.api.distinctQuarter().subscribe({
      next: (data: string[]) => (this.distinctQuarters = data),
      error: (err: any) =>
        console.error('Error fetching distinct quarters', err),
    });
  }

  sortData(column: string) {
    this.sortAscending =
      this.sortedColumn === column ? !this.sortAscending : true;
    this.sortedColumn = column;
    this.mergedArray.sort(
      (a: { [x: string]: number }, b: { [x: string]: number }) => {
        if (a[column] < b[column]) return this.sortAscending ? -1 : 1;
        if (a[column] > b[column]) return this.sortAscending ? 1 : -1;
        return 0;
      }
    );
  }

  attendanceReportPopUp() {
    this.getDistinctMonths();
    this.selectedYear = this.currentYear.toString();
    this.selectedQuarter = 'Q' + this.currentQuarter;
    this.selectedMonth = this.currentMonth;
    this.dialogRef1 = this.dialog.open(this.downloadAttendanceReportPopup, {
      disableClose: true,
      width: '520px',
    });
  }

  shiftAllowanceReportPopUp() {
    this.getDistinctMonths();
    this.selectedYear = this.currentYear.toString();
    this.selectedQuarter = 'Q' + this.currentQuarter;
    this.selectedMonth = this.currentMonth;
    this.dialogRef1 = this.dialog.open(this.downloadShiftReportPopup, {
      disableClose: true,
      width: '520px',
    });
  }

  private getDistinctMonths() {
    this.api.distinctMonths().subscribe({
      next: (data: string[]) => {
        this.distinctMonths = data
          .map((m) => parseInt(m, 10)) // convert each to number
          .sort((a, b) => b - a); // sort in descending order
      },
      error: (err: any) => console.error('Error fetching distinct months', err),
    });
  }

  private saveFile(blob: Blob, fileName: string): void {
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(link.href);
  }

  generateReport(name: string) {
    this.dialogRef1.close();
    const year = parseInt(this.selectedYear, 10);
    const month = parseInt(this.selectedMonth, 10);
    this.loader.show();
    if (name === 'Shift') {
      this.api.downloadExcel(year, month, this.emailId).subscribe({
        next: (blob) => {
          this.saveFile(blob, `Shift_Allowance_${year}_${month}.xlsx`);
          this.loader.hide();
        },
        error: (error) => {
          console.error('Download failed:', error);
          this.loader.hide();
        },
      });
    } else if (name === 'Attendance') {
      this.api.downloadAttendanceExcel(year, month, this.emailId).subscribe({
        next: (blob) => {
          this.saveFile(blob, `Attendance_${year}_${month}.xlsx`);
          this.loader.hide();
        },
        error: (error) => {
          console.error('Download failed:', error);
          this.loader.hide();
        },
      });
    }
  }

  openUsersList(type: string) {
    this.reportType = type;
    this.popUpList = [];
    if (type === 'Reportees') {
      this.popUpList = this.reporteeList;
    } else if (type === 'Working From Home') {
      this.wfhList.forEach((wfhItem: any) => {
        const reportee = this.reporteeList.find(
          (user: any) => user.emailId === wfhItem.emailId
        );
        if (reportee) wfhItem.reporteeName = reportee.reporteeName;
      });
      this.popUpList = this.wfhList;
    } else if (type === 'Working From Office') {
      this.wfoList.forEach((wfoItem: any) => {
        const reportee = this.reporteeList.find(
          (user: any) => user.emailId === wfoItem.emailId
        );
        if (reportee) wfoItem.reporteeName = reportee.reporteeName;
      });
      this.popUpList = this.wfoList;
    } else if (type === 'On Leave') {
      this.leaveList.forEach((leaveItem: any) => {
        const reportee = this.reporteeList.find(
          (user: any) => user.emailId === leaveItem.emailId
        );
        if (reportee) leaveItem.reporteeName = reportee.reporteeName;
      });
      this.popUpList = this.leaveList;
    } else if (type === 'Not Marked') {
      const list = [...this.wfhList, ...this.wfoList, ...this.leaveList];
      const emailIdsInList = list.map((item) => item.emailId);
      const missingEntries = this.reporteeList.filter(
        (reportee) => !emailIdsInList.includes(reportee.emailId)
      );
      this.popUpList = missingEntries;
    }
    this.dialogRef1 = this.dialog.open(this.userReportPopup, {
      disableClose: true,
      width: '500px',
    });
  }

  openActiveTodayPopUp(type: string) {
    this.reportType = type;
    this.popUpList = [];
    if (type === 'Active Today') {
      const list = [...this.wfhList, ...this.wfoList];
      list.forEach((wfoItem: any) => {
        const reportee = this.reporteeList.find(
          (user: any) => user.emailId === wfoItem.emailId
        );
        if (reportee) wfoItem.reporteeName = reportee.reporteeName;
      });
      this.popUpList = list;
    }
    this.dialogRef1 = this.dialog.open(this.userReportPopup2, {
      disableClose: true,
      width: '600px',
    });
  }

  private upcomingLeaves() {
    this.upcomingLeaveList = [];
    this.api.getUpcomingLeaves().subscribe({
      next: (res) => {
        const groupedByEmailId = res.reduce((acc: any, current: any) => {
          const { emailId, date } = current;
          if (!acc[emailId]) {
            acc[emailId] = { emailId, dates: [] };
          }
          acc[emailId].dates.push(date);
          return acc;
        }, {});
        this.upcomingLeaveList = Object.keys(groupedByEmailId).map(
          (emailId) => ({
            emailId,
            upcomingLeaveDates: groupedByEmailId[emailId].dates.join(', '),
          })
        );
      },
      error: (err) => {
        console.log(err);
      },
    });
  }
}
