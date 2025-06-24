import { Component, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { User } from '../super-admin/super-admin.component';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-user-form-dialog',
  templateUrl: './user-form-dialog.component.html',
  styleUrl: './user-form-dialog.component.css',
})
export class UserFormDialogComponent {
  userForm: FormGroup;
  isEdit: boolean;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { isEdit: boolean; user?: User },
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UserFormDialogComponent>,
    private userService: ApiCallingService,
    private snackBar: MatSnackBar
  ) {
    this.isEdit = data.isEdit;

    this.userForm = this.fb.group({
      emailId: [
        { value: data.user?.emailId || '', disabled: this.isEdit },
        [Validators.required, Validators.email],
      ],
      name: [data.user?.name || '', Validators.required],
      sapId: [data.user?.sapId || '', Validators.required],
      region: [data.user?.region || '', Validators.required],
      managerName: [data.user?.managerName || '', Validators.required],
      managerId: [data.user?.managerId || '', Validators.required],
      workLocation: [data.user?.workLocation || 'Both', Validators.required],
      team: [data.user?.team || 'Digital GBS', Validators.required],
      admin: [data.user?.admin || false],
      superAdmin: [data.user?.superAdmin || false],
      permanent: [data.user?.permanent || true],
      shift: [data.user?.shift || '', Validators.required],
      leave: [data.user?.leave || 0, [Validators.required, Validators.min(0)]],
      password: [data.user?.password],
    });
  }

  save() {
    if (this.userForm.invalid) return;

    const formData = this.userForm.getRawValue(); // getRawValue to include disabled emailId
    formData.emailId = formData.emailId.toLowerCase(); // Ensure email is in lowercase
    formData.admin = formData.admin || false;
    formData.superAdmin = formData.superAdmin || false;
    formData.permanent = formData.permanent || false;
    formData.leave = formData.leave || 0; // Default leave to 0 if not set
    formData.id = formData.emailId;
    formData.empId = '';

    if (formData.password) {
      formData.password = formData.password.trim();
    } else {
      formData.password = '12345'; // Set a default password if not editing
    }
    const saveOperation = this.isEdit
      ? this.userService.updateExistingUser(formData.emailId, formData)
      : this.userService.addNewUser(formData);

    saveOperation.subscribe({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: (res: any) => {
        const message =
          res.message ||
          (this.isEdit
            ? 'User updated successfully'
            : 'User added successfully');
        this.snackBar.open(message, 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        const errorMessage =
          err.error?.message || 'Something went wrong. Please try again.';
        this.snackBar.open(errorMessage, 'Close', { duration: 3000 });
      },
    });
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
