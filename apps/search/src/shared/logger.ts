export interface AppLogger {
  readonly error: (message: string, context?: unknown) => void;
  readonly warn: (message: string, context?: unknown) => void;
  readonly info: (message: string, context?: unknown) => void;
}

export const consoleLogger: AppLogger = {
  error: (message, context) =>
    process.stderr.write(
      `${message} ${context === undefined ? "" : String(context)}\n`,
    ),
  warn: (message, context) => console.warn(message, context ?? ""),
  info: (message, context) =>
    process.stdout.write(
      `${message} ${context === undefined ? "" : String(context)}\n`,
    ),
};
