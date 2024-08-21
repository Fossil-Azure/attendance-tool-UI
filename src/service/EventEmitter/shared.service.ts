/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, EventEmitter } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  public popupTrigger: EventEmitter<any> = new EventEmitter();

  constructor() { }

  triggerPopup(data: any) {
    this.popupTrigger.emit(data);
  }
}
