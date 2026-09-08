import { Effect } from "effect";
import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";

export const httpClientFromResponses = (
  respond: (
    request: HttpClientRequest.HttpClientRequest,
  ) => Effect.Effect<Response, Error>,
) =>
  HttpClient.make((request) =>
    respond(request).pipe(
      Effect.map((response) => HttpClientResponse.fromWeb(request, response)),
      Effect.mapError(
        (cause) =>
          new HttpClientError.HttpClientError({
            reason: new HttpClientError.TransportError({ request, cause }),
          }),
      ),
    ),
  );
