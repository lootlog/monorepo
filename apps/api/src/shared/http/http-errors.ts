type HttpErrorBody = string | Readonly<Record<string, unknown>>;

export const HttpStatus = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408,
  GONE: 410,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

const defaultBody = (status: number): HttpErrorBody => ({ statusCode: status });

const errorMessage = (response: HttpErrorBody, status: number): string => {
  if (typeof response === "string") return response;
  if (typeof response.message === "string") return response.message;
  return `HTTP ${status}`;
};

export class HttpException extends Error {
  constructor(
    private readonly response: HttpErrorBody,
    private readonly status: number,
  ) {
    super(errorMessage(response, status));
    this.name = new.target.name;
  }

  getResponse(): HttpErrorBody {
    return this.response;
  }

  getStatus(): number {
    return this.status;
  }
}

const statusError = (status: number) =>
  class extends HttpException {
    constructor(response: HttpErrorBody = defaultBody(status)) {
      super(response, status);
    }
  };

export class BadRequestException extends statusError(HttpStatus.BAD_REQUEST) {}
export class UnauthorizedException extends statusError(
  HttpStatus.UNAUTHORIZED,
) {}
export class ForbiddenException extends statusError(HttpStatus.FORBIDDEN) {}
export class NotFoundException extends statusError(HttpStatus.NOT_FOUND) {}
export class ConflictException extends statusError(HttpStatus.CONFLICT) {}
export class GoneException extends statusError(HttpStatus.GONE) {}
export class UnprocessableEntityException extends statusError(
  HttpStatus.UNPROCESSABLE_ENTITY,
) {}
export class ServiceUnavailableException extends statusError(
  HttpStatus.SERVICE_UNAVAILABLE,
) {}
export class InternalServerErrorException extends statusError(
  HttpStatus.INTERNAL_SERVER_ERROR,
) {}

export class Logger {
  constructor(private readonly context?: string) {}

  debug(message: unknown, ...details: ReadonlyArray<unknown>): void {
    console.debug(this.context, message, ...details);
  }

  error(message: unknown, ...details: ReadonlyArray<unknown>): void {
    console.error(this.context, message, ...details);
  }

  log(message: unknown, ...details: ReadonlyArray<unknown>): void {
    console.info(this.context, message, ...details);
  }

  verbose(message: unknown, ...details: ReadonlyArray<unknown>): void {
    console.debug(this.context, message, ...details);
  }

  warn(message: unknown, ...details: ReadonlyArray<unknown>): void {
    console.warn(this.context, message, ...details);
  }
}
