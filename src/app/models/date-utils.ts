const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export function parseApiDate(dmy: string): Date {
  const [dd, mmmm, yyyy] = dmy.split('-');
  const day = Number(dd);
  const monthIndex = MONTHS.findIndex(m => m.toLowerCase() === mmmm.toLowerCase());
  return new Date(Number(yyyy), monthIndex, day);
}

export function fmtKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
