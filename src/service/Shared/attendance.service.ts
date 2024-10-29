/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {

  constructor() { }
  
  private openPopupSource = new Subject<void>();
  openPopup$ = this.openPopupSource.asObservable();

  triggerPopup(data: any) {
    this.openPopupSource.next(data);
  }
}
