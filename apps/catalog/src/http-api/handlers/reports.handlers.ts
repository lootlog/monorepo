import {
  applicationErrorHttpResponse,
  AuthenticationRequiredError,
} from "@lootlog/protocol/http/errors";
import { readForwardAuthIdentity } from "@lootlog/schema/api-key-policy";
import { readForwardedPlatformRoles } from "@lootlog/schema/platform-roles";
import { Effect } from "effect";
import { HttpServerRequest } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import {
  CatalogReports,
  type ReportCaller,
  type ReportsModule,
} from "#src/reports/reports.service";
import { CatalogApi } from "../catalog-api.js";

const asCaller = <A, E>(
  operation: (
    reports: ReportsModule,
    caller: ReportCaller,
  ) => Effect.Effect<A, E>,
) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const identity = readForwardAuthIdentity(request.headers);

    if (!identity) return yield* new AuthenticationRequiredError();
    const reports = yield* CatalogReports;

    return yield* operation(reports, {
      userId: identity.userId,
      roles: readForwardedPlatformRoles(request.headers),
    });
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
