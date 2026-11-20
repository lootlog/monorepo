import {
  applicationErrorHttpResponse,
  DependencyUnavailableError,
  HttpErrorResponse,
} from "@lootlog/protocol/http/errors";
import { Effect } from "effect";
import { HttpApiSchema } from "effect/http-api";

/** The `503` a search operation answers when the search engine fails. */
export const SearchUnavailable = HttpErrorResponse.pipe(
  HttpApiSchema.status(503),
);

/** A failed search is an explicit unavailable response, not an empty success. */
export const runSearchOperation = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, () =>
    applicationErrorHttpResponse(
      new DependencyUnavailableError("Search unavailable"),
    ),
  );
