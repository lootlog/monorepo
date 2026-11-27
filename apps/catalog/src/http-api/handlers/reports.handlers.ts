import { applicationErrorHttpResponse } from "@lootlog/protocol/http/errors";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  CatalogReports,
  type ReportsModule,
} from "#src/reports/reports.service";
import {
  type CatalogCaller,
  forwardedCatalogCaller,
} from "#src/shared/catalog-caller";
import { CatalogApi } from "../catalog-api.js";

const asCaller = <A, E>(
  operation: (
    reports: ReportsModule,
    caller: CatalogCaller,
  ) => Effect.Effect<A, E>,
) =>
  Effect.gen(function* () {
    const caller = yield* forwardedCatalogCaller;
    const reports = yield* CatalogReports;

    return yield* operation(reports, caller);
  }).pipe(Effect.catch(applicationErrorHttpResponse));

export const ReportsHandlers = HttpApiBuilder.group(
  CatalogApi,
  "CatalogReports",
  (handlers) =>
    handlers
      .handle("CatalogReportsControllerCreate", ({ payload }) =>
        asCaller((reports, caller) => reports.create(caller, payload)),
      )
      .handle("CatalogReportsControllerGetOwn", ({ query }) =>
        asCaller((reports, caller) => reports.getOwn(caller, query)),
      )
      .handle("CatalogReportsControllerWithdraw", ({ params }) =>
        asCaller((reports, caller) =>
          reports.withdraw(caller, params.reportId),
        ),
      )
      .handle("CatalogReportsControllerGetViewer", () =>
        asCaller((reports, caller) => Effect.succeed(reports.viewer(caller))),
      )
      .handle("CatalogReportsControllerList", ({ query }) =>
        asCaller((reports, caller) => reports.list(caller, query)),
      )
      .handle("CatalogReportsControllerReview", ({ payload }) =>
        asCaller((reports, caller) => reports.review(caller, payload)),
      ),
);
