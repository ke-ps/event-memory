export function eventTimeSuffix(startTime: string | null): string {
  return startTime ? `, ${startTime.slice(0, 5)}` : '';
}
