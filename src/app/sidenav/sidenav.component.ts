/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { SharedService } from 'src/service/EventEmitter/shared.service';

interface ApprovalListResponse {
  raisedByList: any[];
  raisedToList: any[];
}

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.css']
})
export class SidenavComponent {

  email: any;
  detailedArray: any;
  admin: boolean = false;
  raisedByList!: any[];
  raisedToList!: any[];
  badgeCount: any;

  constructor(private router: Router, private sharedService: SharedService,
    private api: ApiCallingService, private http: HttpClient) { }

  ngOnInit() {
    const userDataString = sessionStorage.getItem('user');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      this.email = userData.emailId;
      this.admin = userData.admin;
    } else {
      this.router.navigateByUrl('/');
    }
    
    this.badgeCount = 0;
    this.getApprovalList(this.email).subscribe(
      (response: ApprovalListResponse) => {
        this.raisedByList = response.raisedByList;
        this.raisedToList = response.raisedToList;
        this.raisedToList.forEach(element => {
          if (element.status == 'Pending') {
            this.badgeCount++;
          }
        });
      },
      (error: any) => {
        console.error("Error fetching approval list:", error);
      }
    );
  }

  getApprovalList(emailId: string): Observable<ApprovalListResponse> {
    const baseUrl = environment.apiUrl;
    // const baseUrl = "http://localhost:8080";

    const apiUrl = `${baseUrl}/requestApproval`;
    const payload = { raisedBy: emailId, raisedTo: emailId };
    return this.http.post<ApprovalListResponse>(apiUrl, payload);
  }

  onButtonClick(data: any): void {
    this.sharedService.triggerPopup(data);
  }
}