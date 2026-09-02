export interface ApplicationLogger {
  log(entry: unknown, ...context: unknown[]): void;
  info(entry: unknown, ...context: unknown[]): void;
  warn(entry: unknown, ...context: unknown[]): void;
  error(entry: unknown, ...context: unknown[]): void;
  debug(entry: unknown, ...context: unknown[]): void;
}

const render = (entry: unknown): string =>
  typeof entry === "string" ? entry : JSON.stringify(entry);

export const applicationLogger: ApplicationLogger = {
  log: (entry) => console.log(render(entry)),
  info: (entry) => console.info(render(entry)),
  warn: (entry) => console.warn(render(entry)),
  error: (entry) => console.error(render(entry)),
  debug: (entry) => console.debug(render(entry)),
};
