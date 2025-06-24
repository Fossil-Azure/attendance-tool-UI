/* eslint-disable @typescript-eslint/no-explicit-any */
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { UserFormDialogComponent } from '../user-form-dialog/user-form-dialog.component';
import { LoaderService } from 'src/service/Loader/loader.service';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';

// Define the User interface if not already imported
export interface User {
  emailId: string;
  name: string;
  sapId: string;
  region: string;
  managerName: string;
  managerId: string;
  workLocation: string;
  team: string;
  admin: boolean;
  superAdmin: boolean;
  permanent: boolean;
  shift: string;
  leave: number;
  password?: string; // Optional if not editing
}

@Component({
  selector: 'app-super-admin',
  templateUrl: './super-admin.component.html',
  styleUrl: './super-admin.component.css',
})
export class SuperAdminComponent implements OnInit, AfterViewInit {
  @ViewChild(MatSort)
  sort!: MatSort;

  users: MatTableDataSource<User> = new MatTableDataSource<User>();
  columns: string[] = ['emailId', 'name', 'role', 'actions'];

  constructor(
    private api: ApiCallingService,
    private dialog: MatDialog,
    private loader: LoaderService,
    private snackBar: MatSnackBar
  ) {}
  ngAfterViewInit(): void {
    this.users.sort = this.sort;
    setTimeout(() => {
      this.sort.active = 'name';
      this.sort.direction = 'asc';
      this.sort.sortChange.emit({
        active: this.sort.active,
        direction: this.sort.direction,
      });
    });
  }

  ngOnInit(): void {
    this.fetchUsers();
  }

  fetchUsers() {
    this.loader.show();
    this.api.getAllUsers().subscribe({
      next: (res) => {
        this.users = new MatTableDataSource(res);
        this.users.sort = this.sort;
        this.loader.hide();
      },
      error: (err) => {
        console.error('Error fetching users:', err);
        this.loader.hide();
      },
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.users.filter = filterValue.trim().toLowerCase();
  }

  openAddUserDialog() {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      data: { isEdit: false },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) this.fetchUsers();
    });
  }

  openEditUserDialog(user: unknown) {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      data: { isEdit: true, user },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) this.fetchUsers();
    });
  }

  deleteUser(emailId: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.api.deleteUser(emailId).subscribe({
        next: (res: any) => {
          this.snackBar.open(
            res.message || 'User deleted successfully',
            'Close',
            { duration: 3000 }
          );
          this.fetchUsers();
        },
        error: (err) => {
          const msg = err.error?.message || 'Failed to delete user';
          this.snackBar.open(msg, 'Close', { duration: 3000 });
        },
      });
    }
  }

  resetPassword(emailId: string) {
    if (confirm('Reset password for this user to default 12345?')) {
      this.api.resetUserPassword(emailId, "12345").subscribe({
        next: (res: any) => {
          this.snackBar.open(
            res.message || 'Password reset successfully',
            'Close',
            { duration: 3000 }
          );
        },
        error: (err) => {
          const msg = err.error?.message || 'Failed to reset password';
          this.snackBar.open(msg, 'Close', { duration: 3000 });
        },
      });
    }
  }
}
