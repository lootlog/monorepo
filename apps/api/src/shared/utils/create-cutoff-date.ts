export function createCutoffDate(retentionDays: number): Date {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  return cutoffDate;
}
