import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface AttendanceSummaryItem {
  date: string; // 'YYYY-MM-DD (Tue)'
  attendance: string;
  reason: string;
  approvalRequired?: boolean;
}

export interface SummaryDialogData {
  summary: AttendanceSummaryItem[];
  anyApprovalsRequired: boolean;
}

@Component({
  selector: 'app-summary-dialog',
  templateUrl: './summary-dialog.component.html',
  styleUrl: './summary-dialog.component.css'
})
export class SummaryDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SummaryDialogComponent, { confirmed: boolean }>,
    @Inject(MAT_DIALOG_DATA) public data: SummaryDialogData
  ) { }


  onCancel() {
    this.dialogRef.close({ confirmed: false });
  }

  onConfirm() {
    this.dialogRef.close({ confirmed: true });
  }
}
