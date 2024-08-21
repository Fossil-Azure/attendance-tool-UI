import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserDashboardComponent } from './user-dashboard.component';
import { MatDialog } from '@angular/material/dialog';
import { ApiCallingService } from 'src/service/API/api-calling.service';
import { LoaderService } from 'src/service/Loader/loader.service';
import { Router } from '@angular/router';
import { SharedService } from 'src/service/EventEmitter/shared.service';
import { of } from 'rxjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

describe('UserDashboardComponent', () => {
  let component: UserDashboardComponent;
  let fixture: ComponentFixture<UserDashboardComponent>;
  let loaderService: LoaderService;
  let apiService: ApiCallingService;
  let router: Router;
  let dialog: MatDialog;
  let sharedService: SharedService;

  beforeEach(async () => {
    const loaderServiceMock = {
      show: jasmine.createSpy('show'),
      hide: jasmine.createSpy('hide')
    };

    const apiServiceMock = {
      getUserAttendance: jasmine.createSpy('getUserAttendance').and.returnValue(of({})),
      attendance: jasmine.createSpy('attendance').and.returnValue(of({})),
      addUserAttendance: jasmine.createSpy('addUserAttendance').and.returnValue(of({})),
      getDetailedAttendance: jasmine.createSpy('getDetailedAttendance').and.returnValue(of([])),
      getCategoryAttendance: jasmine.createSpy('getCategoryAttendance').and.returnValue(of([]))
    };

    const routerMock = {
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true)),
      url: '/'
    };

    const dialogMock = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of(true)),
        close: jasmine.createSpy('close')
      })
    };

    const sharedServiceMock = {
      popupTrigger: of({})
    };

    await TestBed.configureTestingModule({
      declarations: [UserDashboardComponent],
      providers: [
        { provide: LoaderService, useValue: loaderServiceMock },
        { provide: ApiCallingService, useValue: apiServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: SharedService, useValue: sharedServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserDashboardComponent);
    component = fixture.componentInstance;
    loaderService = TestBed.inject(LoaderService);
    apiService = TestBed.inject(ApiCallingService);
    router = TestBed.inject(Router);
    dialog = TestBed.inject(MatDialog);
    sharedService = TestBed.inject(SharedService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter dates correctly in myFilter function', () => {
    const validDate = new Date(2024, 3, 5); // April 5, 2024 (Friday)
    expect(component.myFilter(validDate)).toBe(true);

    const invalidDate = new Date(2024, 2, 31); // March 31, 2024
    expect(component.myFilter(invalidDate)).toBe(false);

    const weekendDate = new Date(2024, 3, 6); // April 6, 2024 (Saturday)
    expect(component.myFilter(weekendDate)).toBe(false);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // Tomorrow's date
    expect(component.myFilter(futureDate)).toBe(false);

    expect(component.myFilter(null)).toBe(false);
  });

  it('should navigate to root if not authorized', () => {
    sessionStorage.setItem('auth', 'Unauthorized');
    component.ngOnInit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should get current quarter and year', () => {
    component.getCurrentQuarterAndYear();
    expect(component.currentQuarter).toBeDefined();
    expect(component.currentYear).toBeDefined();
    expect(component.time).toBeDefined();
  });

  it('should open dialog', () => {
    component.openDialog();
    expect(dialog.open).toHaveBeenCalled();
  });

  it('should open dialog2', () => {
    component.openDialog2();
    expect(dialog.open).toHaveBeenCalled();
  });

  it('should confirm attendance', () => {
    component.selectedDate = new Date(2024, 3, 5); // April 5, 2024
    component.selectedAttendance = 'Work From Home';
    component.confirmAttendance();
    expect(loaderService.show).toHaveBeenCalled();
    expect(apiService.attendance).toHaveBeenCalled();
  });

  it('should sort data correctly', () => {
    component.detailedArray = [
      { date: new Date(2024, 3, 1) },
      { date: new Date(2024, 3, 5) }
    ];
    component.sortData();
    expect(component.detailedArray[0].date).toEqual(new Date(2024, 3, 5));
  });
});
