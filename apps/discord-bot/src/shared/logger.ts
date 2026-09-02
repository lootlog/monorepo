export class AppLogger {
  constructor(private readonly context: string) {}
  log(message: string): void {
    console.info(`[${this.context}] ${message}`);
  }
  error(message: string): void {
    console.error(`[${this.context}] ${message}`);
  }
}
