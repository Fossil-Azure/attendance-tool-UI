/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class ApiCallingService {

  private baseUrl = environment.apiUrl;
  // private baseUrl = "http://localhost:8080"

  private loginUrl = `${this.baseUrl}/login`;
  private markAttendance = `${this.baseUrl}/addAttendance`;
  private qtrLevelAttendance = `${this.baseUrl}/addUserAttendance`;
  private userLevelAttendance = `${this.baseUrl}/getUserAttendance`;
  private detailedAttendance = `${this.baseUrl}/detailedAttendance`;
  private detailedAttendanceQtr = `${this.baseUrl}/detailedAttendanceQtr`;
  private attendanceCategory = `${this.baseUrl}/attendanceCategory`;
  private allUsers = `${this.baseUrl}/allUsers`;
  private allUserAttendance = `${this.baseUrl}/allAttendance`;
  private downloadQtrAttendace = `${this.baseUrl}/adminQtrReport`;
  private downloadMthAttendace = `${this.baseUrl}/adminMthReport`;
  private distinctYears = `${this.baseUrl}/distinctYears`;
  private distinctQtr = `${this.baseUrl}/distinctQuarters`;
  private distinctMonth = `${this.baseUrl}/distinctMonths`;
  private adminMonthlyAttendance = `${this.baseUrl}/addMonthlyAttendance`;
  private resetPassword = `${this.baseUrl}/resetPassword`;
  private userMonthlyAttendance = `${this.baseUrl}/userMonthlyAttendance`;
  private subOrdinatesList = `${this.baseUrl}/subordinates`;
  private requestList = `${this.baseUrl}/requestApproval`;
  private sendRequest = `${this.baseUrl}/saveForApproval`;
  private updateAttendance = `${this.baseUrl}/updateAttendance`;
  private checkAttendance = `${this.baseUrl}/checkAttendance`;
  private userAllowance = `${this.baseUrl}/userAllowance`;
  private downloadExcelSheet = `${this.baseUrl}/download/excel`;
  private downloadAttendanceSheet = `${this.baseUrl}/download/attendanceExcel`;
  private usersLeaves = `${this.baseUrl}/getLeaves`;
  private updateLeaves = `${this.baseUrl}/updateLeaves`;
  private todaysAttendance = `${this.baseUrl}/todayAttendance`;
  private qtrAttendance = `${this.baseUrl}/qtrAttendance`;
  private upcomingLeaves = `${this.baseUrl}/upcomingLeaves`;
  private addUser = `${this.baseUrl}/addUser`;
  private calendarView = `${this.baseUrl}/calendarView`;
  private pendingApproval = `${this.baseUrl}/pendingReq`;

  constructor(private http: HttpClient) { }

  login(email: string, password: string): Observable<any> {
    return this.http.post(this.loginUrl, { emailId: email, password: password });
  }

  reset(email: string, password: string): Observable<any> {
    return this.http.post(this.resetPassword, { emailId: email, password: password });
  }

  attendance(Id: string, email: string, date: string, atte: string, year: string, qtr: string, mth: string, lub: string, luo: string, shift: string, allowance: number, foodAllowance: number): Observable<any> {
    return this.http.post(this.markAttendance, { id: Id + date, emailId: email, date: date, attendance: atte, year: year, quarter: qtr, month: mth, shift: shift, allowance: allowance, foodAllowance: foodAllowance, lastUpdatedBy: lub, lastUpdatedOn: luo });
  }

  addUserAttendance(Id: string, email: string, attendance: string, year: string, quarter: string, name: string): Observable<any> {
    return this.http.post(this.qtrLevelAttendance, { id: Id + quarter + year, emailId: email, qtr: quarter, year: year, attendance: attendance, name: name });
  }

  getUserAttendance(Id: string, year: string, quarter: string): Observable<any> {
    return this.http.post(this.userLevelAttendance, { id: Id + quarter + year });
  }

  getDetailedAttendance(email: string, year: string, qtr: string, month: string): Observable<any> {
    return this.http.post(this.detailedAttendance, { emailId: email, month: month, quarter: qtr, year: year });
  }

  getDetailedAttendanceQtr(email: string, year: string, qtr: string): Observable<any> {
    return this.http.post(this.detailedAttendanceQtr, { emailId: email, quarter: qtr, year: year });
  }

  getCategoryAttendance(email: string, qtr: string, year: string, attendance: string): Observable<any> {
    return this.http.post(this.attendanceCategory, { emailId: email, quarter: qtr, year: year, attendance: attendance });
  }

  getAllUsers(): Observable<any> {
    return this.http.get(this.allUsers);
  }

  getAllAttendance(): Observable<any> {
    return this.http.get(this.allUserAttendance);
  }

  downloadQtrAdminReport(qtr: string, year: string) {
    return this.http.post(this.downloadQtrAttendace, { quarter: qtr, year: year });
  }

  downloadMonthlyAdminReport(month: string, year: string) {
    return this.http.post(this.downloadMthAttendace, { month: month, year: year });
  }

  distinctYear(): Observable<string[]> {
    return this.http.get<string[]>(this.distinctYears);
  }

  distinctQuarter(): Observable<string[]> {
    return this.http.get<string[]>(this.distinctQtr);
  }

  distinctMonths(): Observable<string[]> {
    return this.http.get<string[]>(this.distinctMonth);
  }

  addMonthlyAttendance(Id: string, email: string, attendance: string, year: string, quarter: string, name: string, month: string, allowance: number, foodAllowance: number): Observable<any> {
    return this.http.post(this.adminMonthlyAttendance, { id: Id + quarter + year + "_" + month, emailId: email, quarter: quarter, year: year, attendance: attendance, name: name, month: month, allowance: allowance, foodAllowance: foodAllowance });
  }

  userMonthlyAttendanceData(email: string, year: string, quarter: string, month: string): Observable<any> {
    return this.http.post(this.userMonthlyAttendance, { id: email + quarter + year + "_" + month, emailId: email });
  }

  getListofSubOrdinates(email: string) {
    return this.http.post(this.subOrdinatesList, { emailId: email });
  }

  getApprovalList(email: string) {
    return this.http.post(this.requestList, { raisedBy: email, raisedTo: email })
  }

  sendForApproval(data: any) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(this.sendRequest, {
      name: data.name,
      comments: data.comments,
      date: data.date,
      month: data.month,
      newAttendance: data.newAttendance,
      newShift: data.newShift,
      prevAttendance: data.prevAttendance,
      prevShift: data.prevShift,
      quarter: data.quarter,
      raisedBy: data.raisedBy,
      raisedTo: data.raisedTo,
      status: data.status,
      type: data.type,
      year: data.year,
      permanent: data.permanent
    }, { headers, responseType: 'text' as 'json' });
  }

  updateAttendanceApproval(data: any) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(this.updateAttendance, {
      id: data._id,
      name: data.name,
      comments: data.comments,
      date: data.date,
      month: data.month,
      newAttendance: data.newAttendance,
      newShift: data.newShift,
      prevAttendance: data.prevAttendance,
      prevShift: data.prevShift,
      quarter: data.quarter,
      raisedBy: data.raisedBy,
      raisedTo: data.raisedTo,
      status: data.status,
      type: data.type,
      year: data.year,
      permanent: data.permanent
    }, { headers, responseType: 'text' as 'json' });
  }

  checkAttendanceDuplicate(Id: string, date: string): Observable<any> {
    return this.http.post(this.checkAttendance, { id: Id + date });
  }

  userMonthlyAllowanceData(email: string, year: string, quarter: string): Observable<any> {
    return this.http.post(this.userAllowance, { emailId: email, year: year, quarter: quarter });
  }

  downloadExcel(year: number, month: number, user: string): Observable<Blob> {
    return this.http.get(`${this.downloadExcelSheet}?year=${year}&month=${month}&user=${user}`, { responseType: 'blob' });
  }

  downloadAttendanceExcel(year: number, month: number, user: string): Observable<Blob> {
    return this.http.get(`${this.downloadAttendanceSheet}?year=${year}&month=${month}&user=${user}`, { responseType: 'blob' });
  }

  userLeaves(email: string): Observable<number> {
    return this.http.post<number>(this.usersLeaves, { emailId: email });
  }

  updateUserLeave(email: string): Observable<number> {
    return this.http.post<number>(this.updateLeaves, { emailId: email });
  }

  getTodaysAttendance(emailIds: string[], date: string): Observable<any> {
    return this.http.post<any>(this.todaysAttendance, { emailIds: emailIds, date: date })
  }

  getQtrAttendance(emailIds: string[], year: string, quarter: string): Observable<any> {
    return this.http.post<any>(this.qtrAttendance, { emailIds: emailIds, quarter: quarter, year: year })
  }

  getUpcomingLeaves(): Observable<any> {
    return this.http.post<any>(this.upcomingLeaves, {});
  }

  addNewUser(user: any): Observable<any> {
    return this.http.post<any>(this.addUser, user)
  }

  calendarData(user: any): Observable<any> {
    return this.http.post<any>(this.calendarView, user)
  }

  getPendingApprovalReq(approval: any): Observable<any> {
    return this.http.post<any>(this.pendingApproval, approval)
  }

  searchUserByEmail(email: string): Observable<any> {
    const url = `${this.baseUrl}/searchByEmail/${email}`;
    return this.http.get<any>(url);
  }
}