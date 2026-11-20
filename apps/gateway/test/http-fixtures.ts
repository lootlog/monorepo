import { Effect } from "effect";
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http";

export const httpClientFromResponses = (
  respond: () => Effect.Effect<Response, Error>,
) =>
  HttpClient.make((request) =>
    respond().pipe(
      Effect.mapBoth({
        onSuccess: (response) => HttpClientResponse.fromWeb(request, response),
        onFailure: (cause) =>
          new HttpClientError.HttpClientError({
            reason: new HttpClientError.TransportError({ request, cause }),
          }),
      }),
    ),
  );
