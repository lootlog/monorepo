import { Effect, Predicate, Schema, SchemaIssue } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import { HttpApiMiddleware, HttpApiSchema } from "effect/unstable/httpapi";

const RequestValidationError = Schema.Struct({
  code: Schema.Literal("VALIDATION_ERROR"),
  message: Schema.String,
  issues: Schema.Array(
    Schema.Struct({
      path: Schema.Array(Schema.Union([Schema.String, Schema.Int])),
      message: Schema.String,
    }),
  ),
})
  .annotate({ identifier: "RequestValidationError" })
  .pipe(HttpApiSchema.status(400));

// The declared error documents the 400 response in OpenAPI and generated clients.
export class SchemaErrorResponse extends HttpApiMiddleware.Service<SchemaErrorResponse>()(
  "api/SchemaErrorResponse",
  { error: RequestValidationError },
) {}

const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1();

export const SchemaErrorResponseLive =
  HttpApiMiddleware.layerSchemaErrorTransform(SchemaErrorResponse, (error) => {
    if (error.kind === "Body" || error.kind === "ResponseHeaders") {
      return Effect.fail(error);
    }

    const issues = formatIssues(error.cause.issue).issues.map((issue) => ({
      path: (issue.path ?? []).map((part) =>
        Predicate.isNumber(part) ? part : String(part),
      ),
      message: issue.message,
    }));

    const details = issues
      .map(({ path, message }) => `${path.join(".") || error.kind}: ${message}`)
      .join("; ");

    const body: typeof RequestValidationError.Type = {
      code: "VALIDATION_ERROR",
      message: `Invalid request: ${details}`,
      issues,
    };

    // A failure would be encoded by the first endpoint or middleware error
    // schema that accepts it, so an open 401/403/404 schema could claim it.
    return Effect.succeed(HttpServerResponse.jsonUnsafe(body, { status: 400 }));
  });
