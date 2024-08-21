/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { LoaderService } from 'src/service/Loader/loader.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent {
  loginForm: FormGroup;
  loginError = false;
  errorMessage!: string;

  constructor(private loader: LoaderService, private api: ApiCallingService, private router: Router) {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required])
    }, { validators: this.matchFieldsValidator('email', 'password') });
  }

  ngOnInit() {
    const auth = sessionStorage.getItem('auth');
    if (auth != 'Reset') {
      this.router.navigateByUrl('/');
    }
  }

  matchFieldsValidator(field1: string, field2: string): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const field1Value = control.get(field1)?.value;
      const field2Value = control.get(field2)?.value;

      if (field1Value !== field2Value) {
        return { fieldsMismatch: true };
      }
      return null;
    };
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.loader.show();
      const { password } = this.loginForm.value;
      const userDataString = sessionStorage.getItem('user');
      let emailId;
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        emailId = userData.emailId;
      }
      this.api.reset(emailId, password).subscribe({
        next: () => {
          sessionStorage.setItem('resetFlag', 'true');
          this.router.navigateByUrl('/');
          this.loader.hide();
        },
        error: () => {
          this.loader.hide();
        }
      });
    }
  }
}
