export function formatSeconds(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;

  return `${minutes}m ${seconds}s`;
}
