import { Effect, Predicate, Schema, SchemaIssue } from "effect";
import {
  type HttpApiError,
  HttpApiMiddleware,
  HttpApiSchema,
} from "effect/http-api";
import { httpErrorResponse } from "./errors.js";

/** The `HttpErrorResponse` shape with its validation code and issues spelled out. */
export const RequestValidationError = Schema.Struct({
  code: Schema.Literal("VALIDATION_ERROR"),
  message: Schema.String,
  details: Schema.Struct({
    issues: Schema.Array(
      Schema.Struct({
        path: Schema.Array(Schema.Union([Schema.String, Schema.Int])),
        message: Schema.String,
      }),
    ),
  }),
})
  .annotate({ identifier: "RequestValidationError" })
  .pipe(HttpApiSchema.status(400));

// The declared error documents the 400 response in OpenAPI and generated clients.
export class SchemaErrorResponse extends HttpApiMiddleware.Service<SchemaErrorResponse>()(
  "@lootlog/protocol/SchemaErrorResponse",
  { error: RequestValidationError },
) {}

const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1();

/**
 * The 400 `VALIDATION_ERROR` answer to a request part (`Payload`, `Query`,
 * `Params`, `Headers`) that does not match its schema.
 */
export const requestValidationErrorResponse = (
  kind: HttpApiError.HttpApiSchemaError["kind"],
  error: Schema.SchemaError,
) => {
  const issues = formatIssues(error.issue).issues.map((issue) => ({
    path: (issue.path ?? []).map((part) =>
      Predicate.isNumber(part) ? part : String(part),
    ),
    message: issue.message,
  }));

  const details = issues
    .map(({ path, message }) => `${path.join(".") || kind}: ${message}`)
    .join("; ");

  return httpErrorResponse(400, {
    code: "VALIDATION_ERROR",
    message: `Invalid request: ${details}`,
    details: { issues },
  });
};

export const SchemaErrorResponseLive =
  HttpApiMiddleware.layerSchemaErrorTransform(SchemaErrorResponse, (error) => {
    // A response that does not match its own schema is a server defect.
    if (error.kind === "Body" || error.kind === "ResponseHeaders") {
      return Effect.fail(error);
    }

    // A failure would be encoded by the first endpoint or middleware error
    // schema that accepts it, so an open 401/403/404 schema could claim it.
    return Effect.succeed(
      requestValidationErrorResponse(error.kind, error.cause),
    );
  });
