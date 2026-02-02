/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import moment from 'moment-timezone';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { LoaderService } from 'src/service/Loader/loader.service';
import { provideNativeDateAdapter } from '@angular/material/core';

@Component({
  selector: 'app-edit-attendance',
  templateUrl: './edit-attendance.component.html',
  styleUrl: './edit-attendance.component.css',
  providers: [provideNativeDateAdapter()]
})
export class EditAttendanceComponent {

  now!: moment.Moment;
  currentYear!: number;
  currentMonth: any;
  selectedYear: any;
  selectedMonth: any;
  distinctYears: string[] = [];
  distinctMonths: string[] = [];
  attendanceSuccess: boolean = false;
  time!: string;
  username: any;
  email: any;
  team: any;
  monthNames: { [key: string]: string } = {
    '01': 'January',
    '02': 'February',
    '03': 'March',
    '04': 'April',
    '05': 'May',
    '06': 'June',
    '07': 'July',
    '08': 'August',
    '09': 'September',
    '10': 'October',
    '11': 'November',
    '12': 'December'
  };
  attendanceData: any;
  detailedAttendanceData: any;
  sortColumn: string = '';
  sortAscending: boolean = true;
  options: any[] = [];
  shiftOptions = ['Shift A', 'Shift B', 'Shift C', 'Shift D', 'Shift F'];
  textComment = '';

  @ViewChild('editDialog')
  editDialog!: TemplateRef<any>;
  popUpDate: any;
  popUpAttendance: any;
  popUpShift: any;
  oldPopUpAttendance: any;
  oldPopUpShift: any;
  currentQuarter!: number;
  managerId: any;
  approvalSuccess!: boolean;
  approvalError!: boolean;
  dialogRef: any;
  isPermanent: any;
  selectedAttendanceToEdit: any;
  isWfa: boolean = false;
  halfDayFullDay: string = 'Full Day';

  constructor(private api: ApiCallingService, private loader: LoaderService, private dialog: MatDialog) {
  }

  async ngOnInit() {
    this.loader.show();
    await this.getCurrentQuarterAndYear();
    await this.loadDistinctYears();
    await this.loadDistinctMonths();
    this.loader.hide();
    this.selectedYear = this.currentYear.toString();
    this.selectedMonth = this.currentMonth.toString();
    const userDataString = sessionStorage.getItem('user');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      this.username = userData.name;
      this.email = userData.emailId;
      this.managerId = userData.managerId
      this.team = userData.team;
      this.api.searchUserByEmail(this.email).subscribe({
        next: response => {
          this.isPermanent = response[0].permanent
        },
        error: error => console.error('Error fetching user:', error),
        complete: () => console.log('User fetch completed.')
      });
      this.openDetailedAttendance();
    }
  }

  getCurrentQuarterAndYear(): Promise<void> {
    return new Promise((resolve) => {
      this.now = moment.tz('Asia/Kolkata');
      this.currentYear = this.now.year();
      this.currentQuarter = this.now.quarter();
      this.currentMonth = this.now.format('MM');
      this.time = this.now.format("DD-MMMM-YYYY HH:mm:ss");
      resolve();
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

  loadDistinctMonths() {
    const observer = {
      next: (data: string[]) => {
        this.distinctMonths = data.sort((a, b) => parseInt(b) - parseInt(a));
      },
      error: (err: any) => console.error('Error fetching distinct months', err),
      complete: () => console.log('Fetching distinct months completed')
    };
    this.api.distinctMonths().subscribe(observer);
  }

  openDetailedAttendance() {
    this.loader.show();
    let qtr;
    if (this.selectedMonth == '01' || this.selectedMonth == '02' || this.selectedMonth == '03') {
      qtr = 1;
    } else if (this.selectedMonth == '04' || this.selectedMonth == '05' || this.selectedMonth == '06') {
      qtr = 2;
    } else if (this.selectedMonth == '07' || this.selectedMonth == '08' || this.selectedMonth == '09') {
      qtr = 3;
    } else if (this.selectedMonth == '10' || this.selectedMonth == '11' || this.selectedMonth == '12') {
      qtr = 4;
    }
    this.api.getDetailedAttendance(this.email, this.selectedYear.toString(), "Q" + qtr, this.selectedMonth).subscribe({
      next: (response) => {
        this.detailedAttendanceData = response;
        this.sortData('date')
        this.loader.hide();
      },
      error: () => {
        this.loader.hide();
      }
    });
  }

  sortData(column: string) {
    if (this.sortColumn === column) {
      this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn = column;
      this.sortAscending = true;
    }

    this.detailedAttendanceData.sort((a: { [x: string]: any; }, b: { [x: string]: any; }) => {
      let valueA = a[column];
      let valueB = b[column];

      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
      }
      if (typeof valueB === 'string') {
        valueB = valueB.toLowerCase();
      }

      if (valueA < valueB) {
        return this.sortAscending ? -1 : 1;
      } else if (valueA > valueB) {
        return this.sortAscending ? 1 : -1;
      } else {
        return 0;
      }
    });
  }

  openDialog(item: any): void {
    this.selectedAttendanceToEdit = item;
    this.textComment = "";
    this.popUpDate = this.parseDateString(item.date);

    this.popUpAttendance = item.attendance;
    this.oldPopUpAttendance = this.popUpAttendance;

    if (item.wfhAnywhere) {
      this.isWfa = true;
    } else {
      this.isWfa = false;
    }

    if (item.halfDayOrFullDay === 'Half Day') {
      this.halfDayFullDay = 'Half Day';
    } else {
      this.halfDayFullDay = 'Full Day';
    }

    this.popUpShift = item.shift;
    this.oldPopUpShift = this.popUpShift;

    this.options = ['Work From Office', 'Work From Home', 'Leave'];

    if (item.attendance == 'Leave') {
      this.shiftOptions = ['Absent']
    } else if (item.attendance == 'Public Holiday') {
      this.shiftOptions = ['Holiday']
    }

    this.dialogRef = this.dialog.open(this.editDialog, {
      width: '950px',
    });
  }

  parseDateString(dateString: string): Date {
    const [day, month, year] = dateString.split('-');
    const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
    return new Date(parseInt(year), monthIndex, parseInt(day));
  }

  getDayOfWeek(date: Date): string {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return daysOfWeek[date.getDay()];
  }

  sendForApproval() {
    let type;
    if ((this.oldPopUpAttendance == this.popUpAttendance) && (this.oldPopUpShift == this.popUpShift) && !this.isWfa) {
      type = "No Changes";
    } else if (this.isWfa) {
      type = "WFA Change";
    } else if ((this.oldPopUpAttendance != this.popUpAttendance) && (this.oldPopUpShift == this.popUpShift)) {
      type = "Attendance Change";
    } else if ((this.oldPopUpAttendance == this.popUpAttendance) && (this.oldPopUpShift != this.popUpShift)) {
      type = "Shift Change";
    } else if ((this.oldPopUpAttendance != this.popUpAttendance) && (this.oldPopUpShift != this.popUpShift)) {
      type = "Attendance and Shift Changes";
    }

    const formattedDate = moment(this.popUpDate).format('DD-MMMM-YYYY');
    const selDate = moment(this.popUpDate);
    const year = selDate.year();
    const quarter = selDate.quarter();
    const month = selDate.format('MM');

    const approvalList = {
      id: this.email + formattedDate,
      date: formattedDate,
      year: year.toString(),
      quarter: "Q" + quarter,
      month: month,
      raisedBy: this.email,
      name: this.username,
      raisedTo: this.managerId,
      comments: type,
      status: "Pending",
      type: type,
      prevAttendance: this.oldPopUpAttendance,
      prevShift: this.oldPopUpShift,
      newAttendance: this.popUpAttendance,
      newShift: this.popUpShift,
      permanent: this.isPermanent,
      halfDayFullDay: this.halfDayFullDay,
    };

    if (type == "No Changes" && !this.isWfa) {
      /* empty */
    } else {
      this.loader.show();
      this.dialogRef.close();

      this.api.sendForApproval(approvalList).subscribe({
        next: (response) => {
          if (response === "ApprovalList saved successfully.") {
            this.approvalSuccess = true;
            setTimeout(() => {
              this.approvalSuccess = false;
            }, 3000);
          } else if (response === "Error: ApprovalList with this ID already exists.") {
            this.approvalError = true;
            setTimeout(() => {
              this.approvalError = false;
            }, 3000);
          }
          this.loader.hide();
        },
        error: (error) => {
          console.error("Error during API call:", error);
          this.loader.hide();
        }
      });
    }
  }

  onAttendanceChange(): void {
    if (this.popUpAttendance === 'Leave') {
      this.shiftOptions = ['Absent'];
      this.popUpShift = 'Absent';
    } else if (this.popUpAttendance === 'Public Holiday') {
      this.shiftOptions = ['Holiday'];
      this.popUpShift = 'Holiday';
    } else {
      this.shiftOptions = ['Shift A', 'Shift B', 'Shift C', 'Shift D', 'Shift F'];
      this.popUpShift = null;
    }
  }
}