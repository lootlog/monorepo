/** Error responses the battlelog endpoints declare; every one has the shared body. */
import { HttpErrorResponse } from "@lootlog/protocol/http/errors";
import { HttpApiSchema } from "effect/http-api";

export const BadRequest = HttpErrorResponse.pipe(HttpApiSchema.status(400));

export const Unauthorized = HttpErrorResponse.pipe(HttpApiSchema.status(401));

export const Forbidden = HttpErrorResponse.pipe(HttpApiSchema.status(403));

export const NotFound = HttpErrorResponse.pipe(HttpApiSchema.status(404));

export const ServiceUnavailable = HttpErrorResponse.pipe(
  HttpApiSchema.status(503),
);
