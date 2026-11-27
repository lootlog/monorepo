import { HttpErrorResponse } from "@lootlog/protocol/http/errors";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import {
  CatalogFactPreviewResponse,
  CatalogFactSubmissionRequest,
  CatalogFactSubmissionResponse,
} from "./schemas.js";

const badRequest = HttpErrorResponse.pipe(HttpApiSchema.status(400));

const unauthorized = HttpErrorResponse.pipe(HttpApiSchema.status(401));

const forbidden = HttpErrorResponse.pipe(HttpApiSchema.status(403));

export class CatalogFactsGroup extends HttpApiGroup.make("CatalogFacts").add(
  HttpApiEndpoint.post(
    "CatalogFactsControllerPreview",
    "/catalog/facts/preview",
    {
      payload: CatalogFactSubmissionRequest,
      success: CatalogFactPreviewResponse,
      error: [badRequest, unauthorized, forbidden],
    },
  )
    .annotate(OpenApi.Identifier, "CatalogFactsController_preview")
    .annotate(OpenApi.Summary, "Compare game facts with the catalog")
    .annotate(
      OpenApi.Description,
      "Show which submitted facts are new, already known, or change what the catalog shows, without saving them; catalog moderators only.",
    ),
  HttpApiEndpoint.post(
    "CatalogFactsControllerSubmit",
    "/catalog/facts/submissions",
    {
      payload: CatalogFactSubmissionRequest,
      success: CatalogFactSubmissionResponse,
      error: [badRequest, unauthorized, forbidden],
    },
  )
    .annotate(OpenApi.Identifier, "CatalogFactsController_submit")
    .annotate(OpenApi.Summary, "Save game facts")
    .annotate(
      OpenApi.Description,
      "Save facts read from a recording; catalog moderators only. A recording already imported with the same extractor version changes nothing.",
    ),
) {}
