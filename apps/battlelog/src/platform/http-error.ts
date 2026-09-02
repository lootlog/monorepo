export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.statusCode = statusCode;
  }
}

export class BadRequestException extends HttpError {
  constructor(message = "Bad Request", options?: ErrorOptions) {
    super(400, message, options);
  }
}

export class UnauthorizedException extends HttpError {
  constructor(message = "Unauthorized", options?: ErrorOptions) {
    super(401, message, options);
  }
}

export class ForbiddenException extends HttpError {
  constructor(message = "Forbidden", options?: ErrorOptions) {
    super(403, message, options);
  }
}

export class NotFoundException extends HttpError {
  constructor(message = "Not Found", options?: ErrorOptions) {
    super(404, message, options);
  }
}

export class ServiceUnavailableException extends HttpError {
  constructor(message = "Service Unavailable", options?: ErrorOptions) {
    super(503, message, options);
  }
}
