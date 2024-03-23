export const CURRENT_DATE = new Date();
export const CURRENT_MONTH = CURRENT_DATE.getMonth();
export const CURRENT_YEAR = CURRENT_DATE.getFullYear();
export const EARLIEST_YEAR = 2002;

export const dateDiffInDays = (dt1?: Date, dt2?: Date) => {
  if (!dt1 || !dt2) return;
  return Math.floor((dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60 * 24) + 1);
};
