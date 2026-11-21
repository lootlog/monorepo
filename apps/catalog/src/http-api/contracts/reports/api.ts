/** Endpoints owned by the catalog reports HTTP module. */
import { HttpErrorResponse } from "@lootlog/protocol/http/errors";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import {
  CatalogOwnReportQuery,
  CatalogOwnReportResponse,
  CatalogReportDto_Output,
  CatalogReportParams,
  CatalogReportsQuery,
  CatalogReportsResponseDto_Output,
  CatalogReportViewerResponse,
  CreateCatalogReportRequest,
  ReviewCatalogReportsRequest,
} from "./schemas.js";

const badRequest = HttpErrorResponse.pipe(HttpApiSchema.status(400));

const unauthorized = HttpErrorResponse.pipe(HttpApiSchema.status(401));

const forbidden = HttpErrorResponse.pipe(HttpApiSchema.status(403));

const notFound = HttpErrorResponse.pipe(HttpApiSchema.status(404));

const conflict = HttpErrorResponse.pipe(HttpApiSchema.status(409));

const rateLimited = HttpErrorResponse.pipe(HttpApiSchema.status(429));

/**
 * Signed-in Users report catalog pages that show something wrong, and
 * catalog moderators review the reports. Reports name no Organization; a
 * reporter's identity stays with the catalog.
 */
export class CatalogReportsGroup extends HttpApiGroup.make("CatalogReports")
  .add(
    HttpApiEndpoint.post("CatalogReportsControllerCreate", "/catalog/reports", {
      payload: CreateCatalogReportRequest,
      success: CatalogReportDto_Output.pipe(HttpApiSchema.status(201)),
      error: [badRequest, unauthorized, notFound, rateLimited],
    })
      .annotate(OpenApi.Identifier, "CatalogReportsController_create")
      .annotate(OpenApi.Summary, "Report a catalog page")
      .annotate(
        OpenApi.Description,
        "Report that a catalog page shows something wrong. A User keeps one open report per page: reporting it again replaces the reason and comment.",
      ),
    HttpApiEndpoint.get(
      "CatalogReportsControllerGetOwn",
      "/catalog/reports/own",
      {
        query: CatalogOwnReportQuery,
        success: CatalogOwnReportResponse,
        error: unauthorized,
      },
    )
      .annotate(OpenApi.Identifier, "CatalogReportsController_getOwn")
      .annotate(OpenApi.Summary, "Get your open report about a catalog page"),
    HttpApiEndpoint.delete(
      "CatalogReportsControllerWithdraw",
      "/catalog/reports/:reportId",
      {
        params: CatalogReportParams,
        success: HttpApiSchema.Empty(204),
        error: [unauthorized, notFound],
      },
    )
      .annotate(OpenApi.Identifier, "CatalogReportsController_withdraw")
      .annotate(OpenApi.Summary, "Withdraw your open report")
      .annotate(
        OpenApi.Description,
        "Remove the caller's own report while no moderator has reviewed it.",
      ),
    HttpApiEndpoint.get(
      "CatalogReportsControllerGetViewer",
      "/catalog/reports/viewer",
      { success: CatalogReportViewerResponse, error: unauthorized },
    )
      .annotate(OpenApi.Identifier, "CatalogReportsController_getViewer")
      .annotate(OpenApi.Summary, "Get what the caller may do with reports"),
  )
  .add(
    HttpApiEndpoint.get("CatalogReportsControllerList", "/catalog/reports", {
      query: CatalogReportsQuery,
      success: CatalogReportsResponseDto_Output,
      error: [unauthorized, forbidden],
    })
      .annotate(OpenApi.Identifier, "CatalogReportsController_list")
      .annotate(OpenApi.Summary, "List reported catalog pages")
      .annotate(
        OpenApi.Description,
        "List the pages with reports of one status and their reports; catalog moderators only.",
      ),
    HttpApiEndpoint.post(
      "CatalogReportsControllerReview",
      "/catalog/reports/review",
      {
        payload: ReviewCatalogReportsRequest,
        success: HttpApiSchema.Empty(204),
        error: [unauthorized, forbidden, notFound, conflict],
      },
    )
      .annotate(OpenApi.Identifier, "CatalogReportsController_review")
      .annotate(OpenApi.Summary, "Review catalog reports")
      .annotate(
        OpenApi.Description,
        "Set the status of reports, resolving, rejecting or opening them again; catalog moderators only. Opening a report again conflicts when its reporter has opened another about the same page since.",
      ),
  ) {}
