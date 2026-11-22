import { Effect, Predicate, Schema, SchemaIssue } from "effect";
import {
  type HttpApiError,
  HttpApiMiddleware,
  HttpApiSchema,
} from "effect/http-api";
import { httpErrorResponse } from "./errors.js";

const RequestValidationError = Schema.Struct({
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

export class SchemaErrorResponse extends HttpApiMiddleware.Service<SchemaErrorResponse>()(
  "@lootlog/protocol/SchemaErrorResponse",
  { error: RequestValidationError },
) {}

const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1();

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
    if (error.kind === "Body" || error.kind === "ResponseHeaders") {
      return Effect.fail(error);
    }

    return Effect.succeed(
      requestValidationErrorResponse(error.kind, error.cause),
    );
  });
