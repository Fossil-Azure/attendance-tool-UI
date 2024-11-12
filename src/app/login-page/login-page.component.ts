/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { map, Observable, startWith } from 'rxjs';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { LoaderService } from 'src/service/Loader/loader.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css']
})
export class LoginPageComponent {
  loginForm: FormGroup;
  loginError = false;
  resetSuccess = false;
  errorMessage!: string;
  isPasswordHidden = true;
  usersList!: Observable<string[]>;
  emailControl = this.fb.control('', [
    Validators.required,
    Validators.pattern(/^[\w-\\.]+@fossil\.com$/)
  ]);

  @ViewChild('forgotPasswordPopUp')
  userReportPopup!: TemplateRef<any>;

  dialogRef1!: MatDialogRef<any>;

  constructor(private loader: LoaderService, private api: ApiCallingService, private router: Router, private dialog: MatDialog, private fb: FormBuilder) {
    this.loginForm = this.fb.group({
      email: this.emailControl,
      password: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loader.show();

    this.api.getAllUsers().subscribe({
      next: (data) => {
        const emailIds = data.map((user: any) => user.emailId);
        this.usersList = this.emailControl.valueChanges.pipe(
          startWith(''),
          map(value => (value && value.length > 0) ? this._filterEmails(value, emailIds) : [])
        );
        this.loader.hide()
      },
      error: (error) => {
        console.error('Error fetching users:', error)
        this.loader.hide()
      }
    });

    const auth = sessionStorage.getItem('auth');
    const reset = sessionStorage.getItem('resetFlag');
    if (auth === 'Authorized') {
      this.router.navigateByUrl('/user-dashboard');
    }

    if (reset === 'true') {
      this.resetSuccess = true;
      sessionStorage.removeItem('auth')
      setTimeout(() => {
        this.resetSuccess = false;
        sessionStorage.removeItem('resetFlag');
        sessionStorage.removeItem('auth')
      }, 3000);
    }
  }

  private _filterEmails(value: string | null, emailIds: string[]): string[] {
    const filterValue = (value ?? '').toLowerCase(); // Use non-null assertion or fallback to empty string
    return emailIds.filter(email => email.toLowerCase().includes(filterValue));
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.loader.show();
      const { email, password } = this.loginForm.value;
      if (password == '12345') {
        this.api.login(email, password).subscribe({
          next: (response) => {
            sessionStorage.setItem('auth', 'Reset');
            sessionStorage.setItem('user', JSON.stringify(response));
            this.router.navigateByUrl('/rest-password');
            this.loader.hide();
          },
          error: (error) => {
            if (error.error.message === 'Invalid credentials') {
              this.errorMessage = 'Invalid credentials';
            } else if (error.error.message === 'User not found') {
              this.errorMessage = 'User not found';
            }
            this.loginError = true;
            setTimeout(() => {
              this.loginError = false;
            }, 2000);
            this.loader.hide();
          }
        })
      } else {
        this.api.login(email, password).subscribe({
          next: (response) => {
            sessionStorage.setItem('auth', 'Authorized');
            sessionStorage.setItem('Admin', 'true')
            sessionStorage.setItem('user', JSON.stringify(response));
            this.router.navigateByUrl("/user-dashboard")
            this.loader.hide();
          },
          error: (error) => {
            if (error.error.message === 'Invalid credentials') {
              this.errorMessage = 'Invalid credentials';
            } else if (error.error.message === 'User not found') {
              this.errorMessage = 'User not found';
            }
            this.loginError = true;
            setTimeout(() => {
              this.loginError = false;
            }, 2000);
            this.loader.hide();
          }
        });
      }
    }
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  forgotPassword() {
    this.dialogRef1 = this.dialog.open(this.userReportPopup, {
      disableClose: true,
      width: '500px'
    });
  }

  togglePasswordVisibility() {
    this.isPasswordHidden = !this.isPasswordHidden;
  }
}
