/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { LoaderService } from 'src/service/Loader/loader.service';
import * as moment from 'moment-timezone';
import { Router } from '@angular/router';
import { SharedService } from 'src/service/EventEmitter/shared.service';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ThemePalette, provideNativeDateAdapter } from '@angular/material/core';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { MatSort } from '@angular/material/sort';
import { ProgressSpinnerMode } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css'],
  providers: [provideNativeDateAdapter()]
})
export class UserDashboardComponent {

  currentQuarter!: number;
  currentYear!: number;
  private subscription: Subscription;
  selectedAttendance: any;
  options: any[] = ['Work From Office', 'Work From Home', 'Leave'];
  shiftOptions: any[] = ['Shift A', 'Shift B', 'Shift C', 'Shift D', 'Shift F'];
  number: number = 0;
  remaining: any = 0;
  days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  dialogRef1!: MatDialogRef<any>;
  dialogRef2!: MatDialogRef<any>;
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

  constructor(private loader: LoaderService, private router: Router, private sharedService: SharedService,
    private dialog: MatDialog, private api: ApiCallingService) {
    this.subscription = this.sharedService.popupTrigger.subscribe(data => {
      this.openPopup(data);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  openPopup(data: any) {
    this.openDialog();
  }

  openDialog() {
    this.shift = this.oldShift
    this.startDate = null;
    this.endDate = null;
    this.selectedAttendance = null;
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

  openDialog2() {
    this.calculateWFHDays();
    this.dialogRef2 = this.dialog.open(this.confirmationPopUp, {
      panelClass: 'custom-dialog-container',
      disableClose: true,
      width: '500px'
    });

    this.dialogRef2.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.dialogRef1.close();
      } else { /* empty */ }
    });
  }

  calculateWFHDays(): void {
    this.wfhNumber = this.number;
    this.wfhNumber += this.workFromHomeDays.filter(day => day.label === 'Work From Home').length;
    this.checkWFHApproval();
  }

  checkWFHApproval(): void {
    if (this.wfhNumber > 13 && this.selectedAttendance === 'Work From Home') {
      this.approvalMessage = true;
    } else {
      this.approvalMessage = false;
    }
  }

  async confirmAttendance() {
    this.dialogRef2.close('confirm');
    this.now = moment.tz('Asia/Kolkata');
    this.time = this.now.format("DD-MMMM-YYYY HH:mm:ss");
    let allowance = 0;
    let foodAllowance = 0;

    this.loader.show();
    for (const element of this.workFromHomeDays) {
      try {
        if (element.label == 'Leave') {
          allowance = 0;
          foodAllowance = 0;
        } else {
          if (element.label == "Work From Home" || element.label == "Work From Home - Friday") {
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
              foodAllowance = 0;
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
        this.formattedDate = moment(element.date).format('DD-MMMM-YYYY');
        const selDate = moment(element.date);
        const year = selDate.year();
        const quarter = selDate.quarter();
        const month = selDate.month();

        await this.api.attendance(this.email, this.email, this.formattedDate, element.label, year.toString(),
          "Q" + quarter, (month + 1).toString(), this.email, this.time.toString(), this.shift, allowance, foodAllowance).toPromise();

        await this.api.addUserAttendance(this.email, this.email, element.label, year.toString(),
          "Q" + quarter, this.username).toPromise();

        await this.api.addMonthlyAttendance(this.email, this.email, element.label, year.toString(),
          "Q" + quarter, this.username, (month + 1).toString(), allowance, foodAllowance).toPromise();
      } catch (error) {
        this.loader.hide();
        this.attendanceError = true;
        setTimeout(() => {
          this.attendanceError = false;
        }, 2000);
        console.error("Error handling attendance for date:", this.formattedDate, error);
      }
    }
    this.loader.hide();
    this.refreshPage();
  }

  refreshPage() {
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl], { state: { popupVisible: true } });
    });
  }

  cancelAttendance() {
    this.dialogRef2.close();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  myFilter = (d: Date | null): boolean => {
    if (!d) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const specificDisabledDates = [
      new Date(2024, 7, 15),
      new Date(2024, 9, 2),
      new Date(2024, 9, 31),
      new Date(2024, 10, 1),
      new Date(2024, 11, 25)
    ];

    const isWeekend = (d.getDay() === 0 || d.getDay() === 6);
    const isAfterToday = d > today;
    const isBeforeStart = d < new Date(2024, 4, 1);
    const isSpecificDisabledDate = specificDisabledDates.some(disabledDate =>
      d.getFullYear() === disabledDate.getFullYear() &&
      d.getMonth() === disabledDate.getMonth() &&
      d.getDate() === disabledDate.getDate()
    );

    return !isWeekend && !isAfterToday && !isBeforeStart && !isSpecificDisabledDate;
  };

  onStartDateInput(event: any): void {
    this.startDate = event.value;
  }

  onEndDateInput(event: any): void {
    this.endDate = event.value;
    this.selectedAttendance = null;
    this.filteredShiftOptions = this.shiftOptions;
    this.shift = this.defaultShift;
    this.shiftOptions = ['Shift A', 'Shift B', 'Shift C', 'Shift D', 'Shift F'];
  }

  filterWorkFromHomeDays(start: Date, end: Date): void {
    this.workFromHomeDays = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const day = currentDate.getDay();
      let label = '';
      if (day !== 0 && day !== 6) {
        if (this.selectedAttendance == "Work From Office") {
          label = 'Work From Office';
          if (day === 5) {
            label = 'Work From Office - Friday';
          }
        } else if (this.selectedAttendance == "Work From Home") {
          label = 'Work From Home';
          if (day === 5) {
            label = 'Work From Home - Friday';
          }
        } else if (this.selectedAttendance == "Leave") {
          label = 'Leave'
        }
        this.workFromHomeDays.push({ date: new Date(currentDate), label });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  isTuesday(date: string | Date): boolean {
    const day = new Date(date).getDay();
    this.tuesdayError = false;
    if (day === 2) {
      this.tuesdayError = true;
      return true;
    } else {
      this.tuesdayError = false;
      return false;
    }
  }

  needsManagerApprovalForWFH(): boolean {
    return this.workFromHomeDays.some(day => this.isTuesday(day.date) && day.label === 'Work From Home');
  }

  onAttendanceChange(): void {
    if (this.selectedAttendance === 'Leave') {
      this.filteredShiftOptions = ['Absent'];
      this.shiftOptions = ['Absent'];
      this.shift = 'Absent';
    } else {
      this.shiftOptions = ['Shift A', 'Shift B', 'Shift C', 'Shift D', 'Shift F'];
      this.filteredShiftOptions = this.shiftOptions.filter(option => option !== 'Holiday' && option !== 'Absent');
      this.shift = this.defaultShift;
    }
    if (!this.isSaveDisabled && this.startDate && this.endDate) {
      this.showDummy = false;
      this.filterWorkFromHomeDays(this.startDate, this.endDate);
    } else {
      this.showDummy = true;
      this.workFromHomeDays = [];
      if (this.startDate && this.endDate) {
        const currentDate = new Date(this.startDate);
        while (currentDate <= this.endDate) {
          let label = '';
          if (this.selectedAttendance == "Work From Office") {
            label = 'Work From Office - Friday';
          } else if (this.selectedAttendance == "Work From Home") {
            label = 'Work From Home - Friday';
          }
          this.workFromHomeDays.push({ date: new Date(currentDate), label });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
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

  onDateChange(): void {
    this.isSaveDisabled = true;
    this.selectedAttendance = '';
    const today = new Date();

    if (this.startDate && this.endDate) {
      this.isSaveDisabled = this.checkIfOnlyWeekendsSelected();
    } else {
      this.isSaveDisabled = true;
    }

    if (this.startDate && this.endDate) {
      if (this.isSaveDisabled) {
        if (this.startDate > today || this.endDate > today) {
          console.log("Only Weekends and Future Dates");
          this.options = [];
        } else {
          console.log("Only Weekends and Past Dates");
          this.options = ['Work From Office', 'Work From Home'];
        }
      } else {
        if (this.startDate > today || this.endDate > today) {
          console.log("Weekdays and Weekends and Future Dates");
          this.options = ['Leave'];
        } else {
          console.log("Weekdays and Weekends and Past Dates");
          this.options = ['Work From Office', 'Work From Home', 'Leave'];
        }
      }
    } else {
      this.options = [];
    }
  }


  checkIfOnlyWeekendsSelected(): boolean {
    if (!this.startDate || !this.endDate) {
      return true;
    }
    const currentDate = new Date(this.startDate);
    let weekdaysFound = false;
    while (currentDate <= this.endDate) {
      const day = currentDate.getDay();
      if (day !== 0 && day !== 6) {
        weekdaysFound = true;
        break;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return !weekdaysFound;
  }

  async sendForApproval() {
    this.loader.show();
    try {
      this.dialogRef2.close('confirm');
      let currentWFHCount = this.number;

      for (const element of this.workFromHomeDays) {
        if (element.label === "Work From Home") {
          currentWFHCount++;
        }

        let type = '';
        let allowance: number = 0;
        let foodAllowance: number = 0;

        if (this.isTuesday(element.date) && element.label == "Work From Home") {
          type = "Work From Home Tuesday"
        } else if ((this.oldShift != this.shift) && this.wfhNumber > 13 && (element.label == "Work From Home")) {
          type = "Extra WFH and Shift Change";
        } else if ((this.oldShift != this.shift) && element.label != "Leave" && !this.showDummy) {
          type = "Shift Change";
        } else if ((this.oldShift != this.shift) && element.label == "Leave") {
          type = "Leave"
        } else if (this.showDummy && (this.oldShift != this.shift)) {
          type = "Weekends and Shift Change";
        } else if (this.showDummy) {
          type = "Weekends";
        } else if (currentWFHCount > 13) {
          type = "Extra WFH";
        }

        if (element.label == 'Leave') {
          allowance = 0;
          foodAllowance = 0;
        } else {
          if (element.label == "Work From Home" || element.label == "Work From Home - Friday") {
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
              foodAllowance = 0;
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

        this.formattedDate = moment(element.date).format('DD-MMMM-YYYY');
        const selDate = moment(element.date);
        const year = selDate.year();
        const quarter = selDate.quarter();
        const month = selDate.month();

        if ((type === "Extra WFH" && element.label === "Work From Home - Friday") || element.label == "Work From Home - Friday") {

          await this.api.attendance(this.email, this.email, this.formattedDate, element.label, year.toString(),
            "Q" + quarter, (month + 1).toString(), this.email, this.time.toString(), this.shift, allowance, foodAllowance).toPromise();

          await this.api.addUserAttendance(this.email, this.email, element.label, year.toString(),
            "Q" + quarter, this.email).toPromise();

          await this.api.addMonthlyAttendance(this.email, this.email, element.label, year.toString(),
            "Q" + quarter, this.email, (month + 1).toString(), allowance, foodAllowance).toPromise();
          continue;
        }

        if (type != "Work From Home Tuesday" && type != "Extra WFH and Shift Change" && currentWFHCount <= 13 && element.label == "Work From Home" && !this.showDummy) {
          await this.api.attendance(this.email, this.email, this.formattedDate, element.label, year.toString(),
            "Q" + quarter, (month + 1).toString(), this.email, this.time.toString(), this.shift, allowance, foodAllowance).toPromise();

          await this.api.addUserAttendance(this.email, this.email, element.label, year.toString(),
            "Q" + quarter, this.email).toPromise();

          await this.api.addMonthlyAttendance(this.email, this.email, element.label, year.toString(),
            "Q" + quarter, this.email, (month + 1).toString(), allowance, foodAllowance).toPromise();
          continue;
        }

        const approvalList = {
          id: this.email + this.formattedDate,
          date: this.formattedDate,
          year: year,
          quarter: "Q" + quarter,
          month: (month + 1).toString(),
          raisedBy: this.email,
          name: this.username,
          raisedTo: this.managerId,
          comments: type,
          status: "Pending",
          type: type,
          prevAttendance: "",
          prevShift: this.oldShift,
          newAttendance: element.label,
          newShift: this.shift
        };

        try {
          const checkResponse = await this.api.checkAttendanceDuplicate(this.email, this.formattedDate).toPromise();
          if (checkResponse.status === "Not Exist") {
            await this.api.sendForApproval(approvalList).toPromise();
            this.approvalSuccess = true;
            setTimeout(() => {
              this.approvalSuccess = false;
            }, 5000);
          } else if (checkResponse.status === "Exist") {
            this.attendanceError = true;
            setTimeout(() => {
              this.attendanceError = false;
            }, 3000);
          }
        } catch (error) {
          console.error("Error during API call:", error);
        }
      }
    } finally {
      await this.getUserAttendance()
      await this.getUserLeave();
      this.loader.hide();
    }
  }
}