import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { LoaderService } from 'src/service/Loader/loader.service';

@Component({
  selector: 'app-super-admin',
  templateUrl: './super-admin.component.html',
  styleUrl: './super-admin.component.css'
})
export class SuperAdminComponent {

  userForm: FormGroup;
  regions = ['APAC', 'EMEA', 'INTL'];
  workLocations = ['WFH', 'WFO', 'Both'];
  shifts = ['Shift A', 'Shift B', 'Shift C', 'Shift D', 'Shift F'];
  added: boolean = false;
  error: boolean = false;

  constructor(private fb: FormBuilder, private api: ApiCallingService, private loader: LoaderService) {
    this.userForm = this.fb.group({
      emailId: ['', [Validators.required, Validators.email]],
      name: ['', Validators.required],
      sapId: [''],  // Optional
      empId: [''],  // Optional
      region: ['', Validators.required],  // Dropdown
      managerName: ['', Validators.required],
      workLocation: ['', Validators.required],  // Dropdown
      password: ['', Validators.required],
      team: ['Digital GBS', Validators.required],  // Default value
      shift: ['', Validators.required],  // Dropdown
      admin: [false],
      managerId: ['', [Validators.required, Validators.email]],
      leave: [0, [Validators.required, Validators.min(0)]],  // Double
      superAdmin: [false],
    });
  }

  onSubmit() {
    if (this.userForm.valid) {
      const formValues = this.userForm.value;
      const payload = {
        ...formValues,
        id: formValues.emailId
      };
      this.loader.show();
      this.api.addNewUser(payload).subscribe(
        response => {
          this.userForm.reset({
            emailId: '',
            name: '',
            sapId: '',
            empId: '',
            region: '',
            managerName: '',
            workLocation: '',
            password: '',
            team: 'Digital GBS', // Reset with default value
            shift: '',
            admin: false, // Default value for dropdown
            managerId: '',
            leave: 0, // Default to 0
            superAdmin: false // Default value for dropdown
          });
          this.loader.hide()
          this.added = true;
          setTimeout(() => {
            this.added = false;
          }, 3000);
          console.log('User added successfully', response);
        },
        error => {
          this.loader.hide()
          this.error = true;
          setTimeout(() => {
            this.error = false;
          }, 3000);
          console.error('Error adding user', error);
        }
      );
    } else {
      console.error("Form is invalid");
    }
  }
}
