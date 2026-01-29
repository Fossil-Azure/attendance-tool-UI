/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient } from '@angular/common/http';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { catchError, concatMap, finalize, from, Observable, of } from 'rxjs';
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
  styleUrl: './request-status.component.css',
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
  showAll: boolean = false;
  showAllRaised: boolean = false;
  filteredList: any[] = [];
  filteredByList: any[] = [];
  isPermanent: any;

  constructor(
    private loader: LoaderService,
    private api: ApiCallingService,
    private http: HttpClient,
    private dialog: MatDialog,
    private router: Router
  ) { }

  ngOnInit() {
    this.loader.show();
    const userDataString = sessionStorage.getItem('user');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      this.emailId = userData.emailId;
      this.api.searchUserByEmail(this.emailId).subscribe({
        next: (response) => {
          this.isPermanent = response[0].permanent;
          this.admin = response[0].admin;
        },
        error: (error) => console.error('Error fetching user:', error),
        complete: () => console.log('User fetch completed.'),
      });
    }
    this.getApprovalList(this.emailId).subscribe(
      (response: ApprovalListResponse) => {
        this.raisedByList = response.raisedByList;
        this.raisedToList = response.raisedToList;
        this.filteredList = this.raisedToList.filter(
          (item) => item.status === 'Pending'
        );
        this.filteredByList = this.raisedByList.filter(
          (item) => item.status === 'Pending'
        );
        this.sortRaisedToAndByList();
        this.loader.hide();
      },
      (error) => {
        console.error('Error fetching approval list:', error);
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
    let flag: string;
    item.status = 'Approved';
    if (item.wfhAnywhere) {
      item.isWfhAnywhere = true;
      flag = 'reduce';
    } else if (item.type === 'WFA Change') {
      flag = 'add';
    } else {
      item.isWfhAnywhere = false;
    }
    this.dialogRef.close();
    this.loader.show();
    this.api.updateAttendanceApproval(item).subscribe({
      next: () => {
        if (
          item.wfhAnywhere ||
          item.type === 'WFA Change'
        ) {
          this.api
            .updateUserLeave(item.raisedBy, item.halfDayFullDay, flag)
            .subscribe({
              next: () => {
                // Optionally handle success here
                this.loader.hide();
              },
              error: (error) => {
                console.error('Error updating user leave:', error);
                this.loader.hide();
              },
              complete: () => {
                this.refreshPage();
                this.loader.hide();
              },
            });
        } else {
          this.refreshPage();
          this.loader.hide();
        }
      },
      error: (error) => {
        console.error('Error during API call:', error);
        this.loader.hide();
      },
    });
  }

  reject(item: any) {
    item.status = 'Rejected';
    this.dialogRef.close();
    this.loader.show();
    this.api.updateAttendanceApproval(item).subscribe({
      next: () => {
        this.loader.hide();
        this.refreshPage();
      },
      error: (error) => {
        console.error('Error during API call:', error);
        this.loader.hide();
      },
    });
  }

  revoke(item: any) {
    item.status = 'Delete';
    this.dialogRef.close();
    this.loader.show();
    this.api.updateAttendanceApproval(item).subscribe({
      next: () => {
        this.loader.hide();
        const currentUrl = this.router.url;
        this.router
          .navigateByUrl('/', { skipLocationChange: true })
          .then(() => {
            this.router.navigate([currentUrl]);
          });
      },
      error: (error) => {
        console.error('Error during API call:', error);
        this.loader.hide();
      },
    });
  }

  openReqDetails(item: any) {
    this.approvalList = item;
    this.dialogRef = this.dialog.open(this.reqDetailsPopup, {
      panelClass: 'custom-dialog-container',
      disableClose: true,
      width: '800px',
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
      this.selectedItems = this.selectedItems.filter((i) => i !== item);
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
          element.status = 'Approved';
          let flag: string;
          if (element.wfhAnywhere) {
            element.isWfhAnywhere = true;
            flag = 'reduce';
          } else if (element.type === 'WFA Change') {
            flag = 'add';
          } else {
            element.isWfhAnywhere = false;
          }

          return this.api.updateAttendanceApproval(element).pipe(
            concatMap(() =>
              this.api.updateUserLeave(element.raisedBy, element.halfDayFullDay, flag)
            ),
            catchError((err) => {
              console.error('Error while processing element:', element, err);
              return of(null);
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
          console.error('Error during API pipeline:', error);
          this.loader.hide();
        },
      });
  }

  rejectMultiple() {
    this.loader.show();
    from(this.selectedItems)
      .pipe(
        concatMap((element) => {
          element.status = 'Rejected';
          return this.api.updateAttendanceApproval(element).pipe();
        }),
        finalize(() => {
          this.refreshPage();
          this.loader.hide();
        })
      )
      .subscribe({
        error: (error) => {
          console.error('Error during API call:', error);
          this.loader.hide();
        },
      });
  }

  sortRaisedToAndByList() {
    if (this.raisedToList && this.raisedToList.length > 0) {
      this.raisedToList.sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') {
          return -1;
        }
        if (a.status !== 'Pending' && b.status === 'Pending') {
          return 1;
        }
        return 0;
      });
      this.raisedByList.sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') {
          return -1;
        }
        if (a.status !== 'Pending' && b.status === 'Pending') {
          return 1;
        }
        return 0;
      });
    } else {
      console.warn('raisedToList is empty or undefined.');
    }
  }

  toggleShowAll() {
    this.showAll = !this.showAll;
    if (this.showAll) {
      this.filteredList = this.raisedToList;
    } else {
      this.filteredList = this.raisedToList.filter(
        (item) => item.status === 'Pending'
      );
    }
  }

  toggleShowAllRaised() {
    this.showAllRaised = !this.showAllRaised;
    if (this.showAllRaised) {
      this.filteredByList = this.raisedByList;
    } else {
      this.filteredByList = this.raisedByList.filter(
        (item) => item.status === 'Pending'
      );
    }
  }

  isAllSelected(): boolean {
    return this.filteredList.every((item) => this.isSelected(item));
  }

  isIndeterminate(): boolean {
    const selectedCount = this.selectedItems.length;
    return selectedCount > 0 && selectedCount < this.filteredList.length;
  }

  toggleSelectAll(event: any): void {
    const isChecked = event.target.checked;
    if (isChecked) {
      this.filteredList.forEach((item) => {
        if (item.status === 'Pending' && !this.isSelected(item)) {
          this.selectedItems.push(item);
        }
      });
    } else {
      this.filteredList.forEach((item) => {
        this.selectedItems = this.selectedItems.filter((i) => i !== item);
      });
    }
  }
}
