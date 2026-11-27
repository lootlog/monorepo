import { applicationErrorHttpResponse } from "@lootlog/protocol/http/errors";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { CatalogFacts } from "#src/facts/facts.service";
import { forwardedCatalogCaller } from "#src/shared/catalog-caller";
import { CatalogApi } from "../catalog-api.js";

export const FactsHandlers = HttpApiBuilder.group(
  CatalogApi,
  "CatalogFacts",
  (handlers) =>
    handlers
      .handle("CatalogFactsControllerPreview", ({ payload }) =>
        Effect.gen(function* () {
          const facts = yield* CatalogFacts;

          return yield* facts.preview(yield* forwardedCatalogCaller, payload);
        }).pipe(Effect.catch(applicationErrorHttpResponse)),
      )
      .handle("CatalogFactsControllerSubmit", ({ payload }) =>
        Effect.gen(function* () {
          const facts = yield* CatalogFacts;

          return yield* facts.submit(yield* forwardedCatalogCaller, payload);
        }).pipe(Effect.catch(applicationErrorHttpResponse)),
      ),
);
