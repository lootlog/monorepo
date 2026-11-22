import {
  applicationErrorHttpResponse,
  DependencyUnavailableError,
  HttpErrorResponse,
} from "@lootlog/protocol/http/errors";
import { Effect } from "effect";
import { HttpApiSchema } from "effect/http-api";

export const SearchUnavailable = HttpErrorResponse.pipe(
  HttpApiSchema.status(503),
);

export const runSearchOperation = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, () =>
    applicationErrorHttpResponse(
      new DependencyUnavailableError("Search unavailable"),
    ),
  );
