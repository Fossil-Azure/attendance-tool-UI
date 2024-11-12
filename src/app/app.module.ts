import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms';
import { LoginPageComponent } from './login-page/login-page.component';
import { UserDashboardComponent } from './user-dashboard/user-dashboard.component';
import { HeaderComponent } from './header/header.component';
import { SidenavComponent } from './sidenav/sidenav.component';
import { LoaderComponent } from './loader/loader.component';
import { MatMenuModule } from '@angular/material/menu';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { EditAttendanceComponent } from './edit-attendance/edit-attendance.component';
import { RequestStatusComponent } from './request-status/request-status.component';
import { MatBadgeModule } from '@angular/material/badge';
import { SuperAdminComponent } from './super-admin/super-admin.component';
import { CalendarViewComponent } from './calendar-view/calendar-view.component';
import { CalendarModule } from 'primeng/calendar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';

const routes: Routes = [
  { path: '', component: LoginPageComponent },
  { path: 'user-dashboard', component: UserDashboardComponent },
  { path: 'admin-panel', component: AdminPanelComponent },
  { path: 'rest-password', component: ResetPasswordComponent },
  { path: 'edit-attendance', component: EditAttendanceComponent },
  { path: 'request-status', component: RequestStatusComponent },
  { path: 'super-admin', component: SuperAdminComponent },
  { path: 'calendar-view', component: CalendarViewComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    LoginPageComponent,
    UserDashboardComponent,
    HeaderComponent,
    SidenavComponent,
    LoaderComponent,
    AdminPanelComponent,
    ResetPasswordComponent,
    EditAttendanceComponent,
    RequestStatusComponent,
    SuperAdminComponent,
    CalendarViewComponent
  ],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatRadioModule,
    FormsModule,
    MatSliderModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    RouterModule.forRoot(routes),
    MatMenuModule,
    BaseChartDirective,
    MatDialogModule,
    MatButtonModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatBadgeModule,
    CalendarModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatIconModule
  ],
  providers: [provideCharts(withDefaultRegisterables()), provideHttpClient(withInterceptorsFromDi())]
})
export class AppModule { }
