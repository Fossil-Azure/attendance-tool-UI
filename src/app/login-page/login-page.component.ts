/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { LoaderService } from 'src/service/Loader/loader.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css']
})
export class LoginPageComponent {
  loginForm: FormGroup;
  showPassword = false;
  loginError = false;
  resetSuccess = false;
  errorMessage!: string;

  @ViewChild('forgotPasswordPopUp')
  userReportPopup!: TemplateRef<any>;

  dialogRef1!: MatDialogRef<any>;

  constructor(private loader: LoaderService, private api: ApiCallingService, private router: Router, private dialog: MatDialog) {
    this.loginForm = new FormGroup({
      email: new FormControl('', [
        Validators.required,
        Validators.email,
        // eslint-disable-next-line no-useless-escape
        Validators.pattern(/^[\w-\.]+@fossil.com$/)
      ]),
      password: new FormControl('', [Validators.required])
    });
  }

  ngOnInit() {
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

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  forgotPassword() {
    this.dialogRef1 = this.dialog.open(this.userReportPopup, {
      disableClose: true,
      width: '500px'
    });
  }
}
