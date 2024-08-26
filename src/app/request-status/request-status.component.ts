/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient } from '@angular/common/http';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { concatMap, finalize, from, Observable } from 'rxjs';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { LoaderService } from 'src/service/Loader/loader.service';
import { environment } from 'src/environments/environment.prod';

interface ApprovalListResponse {
  raisedByList: any[];
  raisedToList: any[];
}

@Component({
  selector: 'app-request-status',
  templateUrl: './request-status.component.html',
  styleUrl: './request-status.component.css'
})
export class RequestStatusComponent {
  emailId: any;
  raisedByList: any[] = [];
  raisedToList: any[] = [];
  admin: boolean = false;

  @ViewChild('reqDetails')
  reqDetailsPopup!: TemplateRef<any>;
  popupdetail: any;
  approvalList: any;
  dialogRef: any;
  selectedItems: any[] = [];
  userQtrReport: any;

  constructor(private loader: LoaderService, private api: ApiCallingService,
    private http: HttpClient, private dialog: MatDialog, private router: Router) { }

  ngOnInit() {
    this.loader.show();
    const userDataString = sessionStorage.getItem('user');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      this.emailId = userData.emailId;
      this.admin = userData.admin;
    }
    this.getApprovalList(this.emailId).subscribe(
      (response: ApprovalListResponse) => {
        this.raisedByList = response.raisedByList;
        this.raisedToList = response.raisedToList;
        this.loader.hide();
      },
      (error) => {
        console.error("Error fetching approval list:", error);
        this.loader.hide();
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

  approve(item: any) {
    item.status = "Approved";
    this.dialogRef.close();
    this.loader.show();
    this.api.updateAttendanceApproval(item).subscribe({
      next: () => {
        if (item.type == "Leave") {
          this.api.updateUserLeave(item.raisedBy).subscribe({
            next: () => {
              console.log("Leaves Updated");
            }, error: (error) => {
              console.error("Something went wrong: ", error);
            }
          })
        }
        this.refreshPage();
      },
      error: (error) => {
        console.error("Error during API call:", error);
        this.loader.hide();
      }
    })
  }

  reject(item: any) {
    item.status = "Rejected";
    this.dialogRef.close();
    this.loader.show();
    this.api.updateAttendanceApproval(item).subscribe({
      next: () => {
        this.loader.hide()
        this.refreshPage();
      },
      error: (error) => {
        console.error("Error during API call:", error);
        this.loader.hide();
      }
    })
  }

  revoke(item: any) {
    item.status = "Delete";
    this.dialogRef.close();
    this.loader.show();
    this.api.updateAttendanceApproval(item).subscribe({
      next: () => {
        this.loader.hide()
        const currentUrl = this.router.url;
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate([currentUrl]);
        });
      },
      error: (error) => {
        console.error("Error during API call:", error);
        this.loader.hide();
      }
    })
  }

  openReqDetails(item: any) {
    this.loader.show();
    const emailIds: any[] = [];
    emailIds.push(item.raisedBy);

    this.api.getQtrAttendance(emailIds, item.year, item.quarter).subscribe({
      next: (response) => {
        console.log('User Quarter Report:', response);
        this.userQtrReport = response[0];
        this.loader.hide();

        this.approvalList = item;
        this.dialogRef = this.dialog.open(this.reqDetailsPopup, {
          panelClass: 'custom-dialog-container',
          disableClose: true,
          width: '800px'
        });
      },
      error: () => {
        this.loader.hide();
      }
    });
  }

  refreshPage() {
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
  }

  onSelectionChange(item: any, event: any): void {
    if (event.target.checked) {
      this.selectedItems.push(item);
    } else {
      this.selectedItems = this.selectedItems.filter(i => i !== item);
    }
  }

  isSelected(item: any): boolean {
    return this.selectedItems.includes(item);
  }

  approveMultiple() {
    this.loader.show();
    from(this.selectedItems)
      .pipe(
        concatMap((element) => {
          element.status = "Approved";
          return this.api.updateAttendanceApproval(element).pipe(
            concatMap(() => {
              if (element.type === "Leave") {
                return this.api.updateUserLeave(element.raisedBy).pipe(
                  finalize(() => {
                    console.log("Leaves Updated");
                  })
                );
              } else {
                return from([null]);
              }
            })
          );
        }),
        finalize(() => {
          this.refreshPage();
          this.loader.hide();
        })
      )
      .subscribe({
        error: (error) => {
          console.error("Error during API call:", error);
          this.loader.hide();
        }
      });
  }

  rejectMultiple() {
    this.loader.show();
    from(this.selectedItems)
      .pipe(
        concatMap((element) => {
          element.status = "Rejected";
          return this.api.updateAttendanceApproval(element).pipe();
        }),
        finalize(() => {
          this.refreshPage();
          this.loader.hide();
        })
      )
      .subscribe({
        error: (error) => {
          console.error("Error during API call:", error);
          this.loader.hide();
        }
      });
  }
}