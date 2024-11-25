/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { LoaderService } from 'src/service/Loader/loader.service';
import moment from 'moment-timezone';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ThemePalette, provideNativeDateAdapter } from '@angular/material/core';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { MatSort } from '@angular/material/sort';
import { ProgressSpinnerMode } from '@angular/material/progress-spinner';
import { CalendarViewComponent } from '../calendar-view/calendar-view.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AttendanceService } from 'src/service/Shared/attendance.service';

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css'],
  providers: [provideNativeDateAdapter()]
})
export class UserDashboardComponent {

  currentQuarter!: number;
  currentYear!: number;
  selectedAttendance: any;
  options: any[] = ['Work From Office', 'Work From Home', 'Leave'];
  shiftOptions: any[] = ['Shift A', 'Shift B', 'Shift C', 'Shift D', 'Shift F'];
  number: number = 0;
  remaining: any = 0;
  days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  dialogRef1!: MatDialogRef<any>;
  dialogRef2!: MatDialogRef<any>;
  private dialogRef: MatDialogRef<any> | null = null;
  detailedAttendancePopup!: MatDialogRef<any>;
  username: any;
  team: any;
  defaultShift: any;
  shift: any;
  oldShift: any;
  attendanceData: any = {
    wfo: 0,
    leaves: 0,
    holidays: 0,
    wfhFriday: 0,
    wfoFriday: 0,
  };
  detailedArray: any[] = [];
  popUpTitle: any;
  color: ThemePalette = 'warn';
  mode: ProgressSpinnerMode = 'determinate';
  value = 80;
  selectedYear: any;
  selectedQuarter: any;
  selectedUser: any;
  months: { [key: string]: string[] } = {
    "Q1": ['January', 'February', 'March'],
    "Q2": ['April', 'May', 'June'],
    "Q3": ['July', 'August', 'September'],
    "Q4": ['October', 'November', 'December']
  };

  wfhTuesday: boolean = false;

  filteredMonths: string[] = [];

  @ViewChild('dialogTemplate')
  dialogTemplate!: TemplateRef<any>;

  @ViewChild('confirmationPopUp')
  confirmationPopUp!: TemplateRef<any>;

  @ViewChild('detailedAttendance')
  detailedAttendance!: TemplateRef<any>;

  @ViewChild(MatSort)
  sort!: MatSort;

  @ViewChild(CalendarViewComponent)
  calendarView!: CalendarViewComponent;

  @ViewChild('calendarViewAttendance')
  calendarViewAttendance!: TemplateRef<any>;

  displayedColumns: string[] = ['date', 'attendance'];

  time!: string;
  email!: any;
  now!: moment.Moment;
  attendanceError: boolean = false;
  attendanceSuccess: boolean = false;
  distinctYears: string[] = [];
  distinctQuarters: string[] = [];
  formattedDate!: string;
  managerId: any;
  approvalSuccess: boolean = false;
  approvalError: boolean = false;
  subOrdinates: any;
  admin: boolean = false;
  startDate: Date | null = null;
  endDate: Date | null = null;
  workFromHomeDays: { date: Date, label: string }[] = [];
  maxNumber: number = 13;
  percentage: number = 0;
  cappedPercentage: number = 0;
  leftRotation: string = 'rotate(0deg)';
  rightRotation: string = 'rotate(0deg)';
  monthMapping: { [key: string]: string } = {
    '1': 'January', '2': 'February', '3': 'March', '4': 'April', '5': 'May', '6': 'June',
    '7': 'July', '8': 'August', '9': 'September', '10': 'October', '11': 'November', '12': 'December'
  };
  allowanceData: { [key: string]: number } = {};
  allowances: any;
  filteredShiftOptions: any[] = this.shiftOptions;
  approvalMessage: boolean = false;
  wfhNumber!: number;
  leaves!: number;
  isSaveDisabled: boolean = true;
  showDummy: boolean = false;
  tuesdayError!: boolean;
  holidays: { date: string, name: string }[] = [
    { date: '2024-01-01', name: 'New Year' },
    { date: '2024-01-15', name: 'Makara Sankranti' },
    { date: '2024-01-26', name: 'Republic Day' },
    { date: '2024-04-09', name: 'Ugadi' },
    { date: '2024-05-01', name: 'May Day' },
    { date: '2024-06-17', name: 'Bakrid' },
    { date: '2024-08-15', name: 'Independence Day' },
    { date: '2024-10-02', name: 'Gandhi Jayanti' },
    { date: '2024-10-31', name: 'Deepawali' },
    { date: '2024-11-01', name: 'Kannada Rajyotsava/Diwali' },
    { date: '2024-12-25', name: 'Christmas' },
  ];

  isHolidayInRange: boolean = false;
  holidayDateInRange: string | null = null;
  onlyHoliday: boolean = false;

  selectedDates: Date[] = [];

  wfhCount!: any;
  newShift!: any;
  requiresApproval = false;
  attendanceSummary!: { date: string; attendance: string; reason: string; }[];
  popUpDate: any;
  isPermanent: any;

  constructor(private loader: LoaderService, private router: Router,
    private dialog: MatDialog, private api: ApiCallingService, private snackBar: MatSnackBar, private attendanceService: AttendanceService) {
    this.attendanceService.openPopup$.subscribe((data) => {
      this.popUpDate = data;  // Save the received data
      this.openAttendancePopup();
    });
  }

  async ngOnInit() {
    this.loader.show();
    const auth = sessionStorage.getItem('auth');
    if (auth !== 'Authorized') {
      this.router.navigateByUrl('/');
    } else {
      await this.getCurrentQuarterAndYear();
      await this.loadDistinctYears();
      await this.loadDistinctQuarters();
      this.selectedYear = this.currentYear.toString();
      this.selectedQuarter = "Q" + this.currentQuarter;
      const userDataString = sessionStorage.getItem('user');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        this.username = userData.name;
        this.email = userData.emailId;
        this.selectedUser = this.email;
        this.team = userData.team;
        this.defaultShift = userData.shift;
        this.shift = userData.shift;
        this.managerId = userData.managerId;
        this.oldShift = userData.shift;
        this.isPermanent = userData.permanent;

        try {
          await this.getUserAttendance();
          await this.getUserLeave();
          if (userData.admin) {
            this.admin = true;
            await this.getSubordinates();
          }
        } catch (error) {
          console.error('Error during initialization:', error);
        } finally {
          this.loader.hide();
        }
      } else {
        sessionStorage.removeItem('user');
        this.router.navigateByUrl('/');
      }
    }
  }

  filterMonths(): void {
    this.filteredMonths = this.months[this.selectedQuarter] || [];
  }

  updateProgress(number: number) {
    this.percentage = (number / this.maxNumber) * 100;
    this.cappedPercentage = Math.min(this.percentage, 100);

    const angle = (this.cappedPercentage / 100) * 360;

    if (this.cappedPercentage <= 50) {
      this.rightRotation = `rotate(${angle}deg)`;
      this.leftRotation = 'rotate(0deg)';
    } else {
      this.rightRotation = 'rotate(180deg)';
      this.leftRotation = `rotate(${angle - 180}deg)`;
    }
  }

  getProgressBarClass(): string {
    if (this.percentage < 60) {
      return 'green';
    } else if (this.percentage >= 60 && this.percentage < 85) {
      return 'yellow';
    } else if (this.percentage >= 85 && this.percentage < 95) {
      return 'orange';
    } else {
      return 'red';
    }
  }

  getProgressBarClassForLeaves(): string {
    if (this.leaves >= 15) {
      return 'green';
    } else if (this.leaves >= 10 && this.leaves < 15) {
      return 'yellow';
    } else if (this.leaves >= 5 && this.leaves < 10) {
      return 'orange';
    } else {
      return 'red';
    }
  }

  getSubordinates(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.show();
      this.api.getListofSubOrdinates(this.email).subscribe({
        next: (subordinateResponse) => {
          this.subOrdinates = [];
          const hardCodedEmail = {
            "id": this.email,
            "emailId": this.email,
            "name": this.username
          };
          this.subOrdinates.push(hardCodedEmail);
          if (Array.isArray(subordinateResponse)) {
            this.subOrdinates.push(...subordinateResponse);
          }
          resolve();
          this.loader.hide();
        },
        error: (error) => {
          console.error("Error fetching subordinates list:", error);
          this.loader.hide();
          reject(error);
        }
      });
    });
  }

  getUserLeave(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.show();
      this.api.userLeaves(this.selectedUser).subscribe({
        next: (_response) => {
          this.leaves = _response;
          this.loader.hide();
          resolve();
        },
        error: (_error) => {
          this.loader.hide();
          reject(_error);
        }
      });
    });
  }

  async userChange() {
    await this.refreshCalendarView(this.selectedUser);
    await this.getUserAttendance();
    await this.getUserLeave()
  }

  getUserAttendance(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.show();
      this.api.getUserAttendance(this.selectedUser, this.selectedYear, this.selectedQuarter).subscribe({
        next: (response) => {
          if (response) {
            this.attendanceData = response;
            this.number = response.wfh;
            this.remaining = 13 - this.number;
            this.updateProgress(this.number);
            this.api.userMonthlyAllowanceData(this.selectedUser, this.selectedYear, this.selectedQuarter).subscribe({
              next: (_response) => {
                this.allowances = _response;
                this.filterMonths();
                this.transformData();
                resolve();
                this.loader.hide();
              },
              error: (_error) => {
                this.loader.hide();
                reject(_error);
              }
            });
          } else {
            this.attendanceData = {
              wfo: 0,
              leaves: 0,
              holidays: 0,
              wfhFriday: 0,
              wfoFriday: 0,
              number: 0
            };
            resolve();
            this.loader.hide();
          }
        },
        error: (error) => {
          this.loader.hide();
          reject(error);
        }
      });
    });
  }


  transformData(): void {
    this.allowanceData = {};
    for (const allowance of this.allowances) {
      const monthName = this.monthMapping[allowance.month];
      if (!this.allowanceData[monthName]) {
        this.allowanceData[monthName] = 0;
      }
      this.allowanceData[monthName] += allowance.allowance + allowance.foodAllowance;
    }
  }

  getCurrentQuarterAndYear(): Promise<void> {
    return new Promise((resolve) => {
      this.now = moment.tz('Asia/Kolkata');
      this.currentQuarter = this.now.quarter();
      this.currentYear = this.now.year();
      this.time = this.now.format("DD-MMMM-YYYY HH:mm:ss");
      resolve();
    });
  }

  openDialog() {
    this.shift = this.oldShift
    this.selectedAttendance = null;
    this.selectedDates = []
    this.dialogRef1 = this.dialog.open(this.dialogTemplate, {
      panelClass: 'custom-dialog-container',
      disableClose: true,
      width: '800px'
    });

    this.dialogRef1.afterClosed().subscribe(result => {
      if (result === 'reopen') {
        this.openDialog();
      }
    });
  }

  refreshPage() {
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl], { state: { popupVisible: true } });
    });
  }

  onAttendanceChange() {
    this.filteredShiftOptions = this.shiftOptions;
    if (this.selectedAttendance === 'Leave') {
      this.filteredShiftOptions = ['Absent'];
      this.shiftOptions = ['Absent'];
      this.shift = 'Absent';
    } else {
      this.shiftOptions = ['Shift A', 'Shift B', 'Shift C', 'Shift D', 'Shift F'];
      this.filteredShiftOptions = this.shiftOptions.filter(option => option !== 'Holiday' && option !== 'Absent');
      this.shift = this.defaultShift;
    }
  }

  categoryAttendance(attendance: string) {
    if (attendance == 'Attendance') {
      this.loader.show();
      this.api.getDetailedAttendanceQtr(this.selectedUser, this.selectedYear, this.selectedQuarter).subscribe({
        next: (response) => {
          this.detailedArray = response;
          this.loader.hide();
        },
        error: () => {
          this.loader.hide();
        }
      });
    } else {
      this.loader.show();
      this.api.getCategoryAttendance(this.email, this.selectedQuarter, this.selectedYear, attendance
      ).subscribe({
        next: (response) => {
          this.detailedArray = response;
          this.loader.hide();
        },
        error: () => {
          this.loader.hide();
        }
      });
    }

    this.popUpTitle = attendance + ' For ' + this.selectedQuarter + ' ' + this.selectedYear
    this.detailedAttendancePopup = this.dialog.open(this.detailedAttendance, {
      panelClass: 'custom-dialog-container',
      disableClose: true,
      width: '500px'
    });
  }

  sortAscending: boolean = false;

  sortData() {
    this.sortAscending = !this.sortAscending;
    this.detailedArray.sort((a, b) => {
      if (this.sortAscending) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    });
  }

  loadDistinctYears(): Promise<void> {
    return new Promise((resolve) => {
      const observer = {
        next: (data: string[]) => this.distinctYears = data,
        error: (err: any) => console.error('Error fetching distinct years', err),
        complete: () => console.log('Fetching distinct years completed')
      };
      this.api.distinctYear().subscribe(observer);
      resolve();
    });
  }

  loadDistinctQuarters(): Promise<void> {
    return new Promise((resolve) => {
      const observer = {
        next: (data: string[]) => this.distinctQuarters = data,
        error: (err: any) => console.error('Error fetching distinct quarters', err),
        complete: () => console.log('Fetching distinct quarters completed')
      };
      this.api.distinctQuarter().subscribe(observer);
      resolve();
    });
  }

  refreshCalendarView(selectedUser: string) {
    if (this.calendarView) {
      this.calendarView.refreshCalendar(selectedUser);
    }
  }

  onDateChange(): void {
    // If selectedDates is null or undefined, initialize it as an empty array
    if (!this.selectedDates) {
      this.selectedDates = [];
    }

    // Sort the selectedDates in ascending order
    this.selectedDates.sort((a: Date, b: Date) => {
      return new Date(a).getTime() - new Date(b).getTime(); // Sort by time
    });
  }

  onSavePopUp() {
    this.selectedDates = [];
    this.selectedDates.push(this.popUpDate)
    this.onSave();
  }


  onSave(): void {
    const publicHolidays = ['2024-10-02', '2024-10-31', '2024-11-01', '2024-12-25'];
    const summary: { date: string, attendance: string, reason: string }[] = [];
    let wfhNumber = this.number;
    this.requiresApproval = false;

    for (const date of this.selectedDates) {
      const dayOfWeek = new Date(date).getDay(); // Get day of the week (0: Sunday, 1: Monday, 2: Tuesday, ..., 6: Saturday)
      const formattedDate = moment(date).format('YYYY-MM-DD'); // Format the date for holiday comparison
      const uiDateFormat = moment(date).format('DD-MMMM-YYYY');

      const approvalReasons: string[] = []; // Using an array to collect multiple reasons
      let attendanceType = this.selectedAttendance;
      let requiresApproval = false;

      // Rule 1: If it's Tuesday and WFH is selected, approval is needed
      if (dayOfWeek === 2 && this.selectedAttendance === 'Work From Home') {
        requiresApproval = true;
        this.requiresApproval = true;
        wfhNumber++;
        approvalReasons.push('WFH on Tuesday');
      }

      // Rule 2: If it's a weekend, approval is needed
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        requiresApproval = true;
        this.requiresApproval = true;
        approvalReasons.push('Weekend');
      }

      // Rule 3: If it's a public holiday, approval is needed
      if (publicHolidays.includes(formattedDate)) {
        requiresApproval = true;
        this.requiresApproval = true;
        approvalReasons.push('Public Holiday');
      }

      // Rule 4: If it's a shift change, approval is needed
      if ((this.shift !== this.defaultShift) && this.selectedAttendance !== "Leave") {
        requiresApproval = true;
        this.requiresApproval = true;
        approvalReasons.push('Shift Change');

        // Increment WFH
        if (this.selectedAttendance === 'Work From Home' && dayOfWeek !== 5 && !publicHolidays.includes(formattedDate)) {
          wfhNumber++;
        }
      }

      // Rule 5: Increment WFH count only if no other approval condition applies and WFH is selected
      if (this.selectedAttendance === 'Work From Home' && !requiresApproval && dayOfWeek !== 5 &&
        !(dayOfWeek === 0 || dayOfWeek === 6) && !publicHolidays.includes(formattedDate)) {
        if (wfhNumber >= 13) {
          wfhNumber++;
          requiresApproval = true;
          this.requiresApproval = true;
          approvalReasons.push('Extra WFH');
        } else {
          wfhNumber++;
        }
      }

      // Rule 1: If it's Friday, add the suffix - Friday
      if (dayOfWeek === 5 && this.selectedAttendance !== 'Leave') {
        attendanceType += ' - Friday';
      }

      // Rule 2: If it's a weekend or a public holiday, add the suffix - Others
      if (((dayOfWeek === 0 || dayOfWeek === 6) || publicHolidays.includes(formattedDate)) && this.selectedAttendance !== 'Leave') {
        attendanceType += ' - Others';
      }

      // Merge multiple reasons into a single string
      const approvalReason = approvalReasons.join(', ');

      summary.push({
        date: uiDateFormat,
        attendance: attendanceType,
        reason: approvalReason
      });
    }

    this.attendanceSummary = summary;
    this.dialogRef2 = this.dialog.open(this.confirmationPopUp, {
      data: { summary: summary }
    });
  }

  cancelAttendance() {
    this.dialogRef2.close();
  }

  async confirmAttendance() {
    this.loader.show();
    try {
      this.dialogRef?.close();
      this.dialogRef1?.close();
      this.dialogRef2?.close();
      let allowance = 0;
      let foodAllowance = 0;

      if (this.isPermanent) {
        if (this.selectedAttendance == 'Leave') {
          allowance = 0;
          foodAllowance = 0;
        } else {
          if (this.selectedAttendance == "Work From Home") {
            if (this.shift == "Shift A") {
              allowance = 0;
              foodAllowance = 0;
            } else if (this.shift == "Shift B") {
              allowance = 150;
              foodAllowance = 0;
            } else if (this.shift == "Shift C") {
              allowance = 250;
              foodAllowance = 0;
            } else if (this.shift == "Shift D") {
              allowance = 350;
              foodAllowance = 0;
            } else if (this.shift == "Shift F") {
              allowance = 250;
              foodAllowance = 0;
            }
          } else {
            if (this.shift == "Shift A") {
              allowance = 0;
              foodAllowance = 75;
            } else if (this.shift == "Shift B") {
              allowance = 150;
              foodAllowance = 100;
            } else if (this.shift == "Shift C") {
              allowance = 250;
              foodAllowance = 100;
            } else if (this.shift == "Shift D") {
              allowance = 350;
              foodAllowance = 100;
            } else if (this.shift == "Shift F") {
              allowance = 250;
              foodAllowance = 0;
            }
          }
        }
      } else {
        allowance = 0;
        foodAllowance = 0;
      }

      // Iterate through attendanceSummary sequentially
      for (const element of this.attendanceSummary) {
        // Handle specific attendance conditions
        if (element.attendance == "Work From Home - Others") {
          element.attendance = "Work From Home - Friday";
        } else if (element.attendance == "Work From Office - Others") {
          element.attendance = "Work From Office - Friday";
        }

        // Extract date details
        const selDate = moment(element.date, "DD-MMMM-YYYY");
        const year = selDate.year();
        const quarter = selDate.quarter();
        const month = selDate.month();
        const time = moment().format("DD-MMMM-YYYY HH:mm:ss");

        // Call saveAttendance or sendForApproval based on the condition
        if (element.reason === '') {
          await this.saveAttendance(element, year, quarter, month, time, allowance, foodAllowance);
        } else {
          await this.sendForApproval(element, year, quarter, month);
        }
      }
    } finally {
      await this.refreshDataAfterApiCall(); // Refresh Dashboard data after all operations
      this.loader.hide(); // Loader hide to stop loader after all operations
    }
  }

  // Method to save attendance when no approval is needed
  async saveAttendance(element: any, year: number, quarter: number, month: number, time: string, allowance: number, foodAllowance: number) {
    try {
      // Wait for each API call sequentially
      await this.api.attendance(
        this.email, this.email, element.date, element.attendance, year.toString(),
        "Q" + quarter, (month + 1).toString(), this.email, time.toString(), this.shift, allowance, foodAllowance
      ).toPromise();

      await this.api.addUserAttendance(
        this.email, this.email, element.attendance, year.toString(),
        "Q" + quarter, this.email
      ).toPromise();

      await this.api.addMonthlyAttendance(
        this.email, this.email, element.attendance, year.toString(),
        "Q" + quarter, this.email, (month + 1).toString(), allowance, foodAllowance
      ).toPromise();

      if (element.attendance == 'Leave') {
        await this.api.updateUserLeave(this.email).toPromise();
      }

      this.showNotification('Attendance recorded successfully!', 'success');
    } catch (error) {
      console.error('Error saving attendance for date:', element.date, 'Error:', error);
      this.showNotification('Attendance has already been recorded. To make edits, please use the pencil icon on the left side menu.', 'error');
    }
  }

  // Method to handle the scenario when attendance needs approval
  async sendForApproval(element: any, year: number, quarter: number, month: number) {
    const approvalList = {
      id: this.email + element.date,
      date: element.date,
      year: year,
      quarter: "Q" + quarter,
      month: (month + 1).toString(),
      raisedBy: this.email,
      name: this.username,
      raisedTo: this.managerId,
      comments: element.reason,
      status: "Pending",
      type: element.reason,
      prevAttendance: "",
      prevShift: this.oldShift,
      newAttendance: element.attendance,
      newShift: this.shift,
      permanent: this.isPermanent
    };

    try {
      const checkResponse = await this.api.checkAttendanceDuplicate(this.email, element.date).toPromise();
      if (checkResponse.status === "Not Exist") {
        await this.api.sendForApproval(approvalList).toPromise();
        this.showNotification(`Approval Request Submitted Successfully`, 'success');
      } else if (checkResponse.status === "Exist") {
        this.showNotification(`Attendance or Approval Request already exists`, 'error');
      }
    } catch (error) {
      console.error('Error sending for approval for date:', element.date, 'Error:', error);
      this.showNotification('Error in sending approval request!', 'error');
    }
  }

  async refreshDataAfterApiCall(): Promise<void> {
    try {
      await this.refreshCalendarView(this.selectedUser);
      await this.getUserAttendance();
      await this.getUserLeave();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }

  showNotification(message: string, type: string): void {
    const panelClass = type === 'success' ? 'snackbar-success' : 'snackbar-error';

    this.snackBar.open(message, 'Close', {
      duration: 5000, // 5 seconds
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: [panelClass] // Use the custom styles
    });
  }

  openAttendancePopup(): void {
    // Close the existing dialog if open
    if (this.dialogRef) {
      this.dialogRef.close();
    }

    // Reset data before opening a new dialog
    this.selectedAttendance = '';
    this.shift = this.defaultShift;

    // Open a new dialog and store the reference
    this.dialogRef = this.dialog.open(this.calendarViewAttendance);

    // Additional reset after opening
    this.dialogRef.afterOpened().subscribe(() => {
      this.selectedAttendance = '';
      this.shift = this.defaultShift;
    });

    // Set dialogRef to null on close
    this.dialogRef.afterClosed().subscribe(() => {
      this.dialogRef = null;
    });
  }

}