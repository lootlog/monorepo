import { Effect } from "effect";
import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";

export const httpClientFromResponses = (
  respond: (
    request: HttpClientRequest.HttpClientRequest,
  ) => Effect.Effect<Response, Error>,
) =>
  HttpClient.make((request) =>
    respond(request).pipe(
      Effect.mapBoth({
        onSuccess: (response) => HttpClientResponse.fromWeb(request, response),
        onFailure: (cause) =>
          new HttpClientError.HttpClientError({
            reason: new HttpClientError.TransportError({ request, cause }),
          }),
      }),
    ),
  );
