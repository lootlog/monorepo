/** Endpoints owned by the docs HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  DocsControllerCreateDocument201,
  DocsControllerCreateDocumentPathParams,
  DocsControllerCreateDocumentRequestJson,
  DocsControllerDeleteDocument200,
  DocsControllerDeleteDocumentPathParams,
  DocsControllerGetDocument200,
  DocsControllerGetDocumentPathParams,
  DocsControllerGetDocuments200,
  DocsControllerGetDocumentsPathParams,
  DocsControllerGetHistory200,
  DocsControllerGetHistoryPathParams,
  DocsControllerGetHistorySnapshot200,
  DocsControllerGetHistorySnapshotPathParams,
  DocsControllerGetTrash200,
  DocsControllerGetTrashPathParams,
  DocsControllerPurgeDocument200,
  DocsControllerPurgeDocumentPathParams,
  DocsControllerRestoreDocument200,
  DocsControllerRestoreDocumentPathParams,
  DocsControllerUpdateDocument200,
  DocsControllerUpdateDocumentPathParams,
  DocsControllerUpdateDocumentRequestJson,
} from "./schemas.js";

export class DocsGroup extends HttpApiGroup.make("docs").add(
  HttpApiEndpoint.get("DocsControllerGetDocuments", "/guilds/:guildId/docs", {
    params: DocsControllerGetDocumentsPathParams,
    success: DocsControllerGetDocuments200,
    error: HttpApiSchema.Empty(403),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "DocsController_getDocuments")
    .annotate(OpenApi.Summary, "Get guild documents")
    .annotate(OpenApi.Description, "Retrieve document summaries for a guild"),
  HttpApiEndpoint.post(
    "DocsControllerCreateDocument",
    "/guilds/:guildId/docs",
    {
      params: DocsControllerCreateDocumentPathParams,
      payload: DocsControllerCreateDocumentRequestJson,
      success: DocsControllerCreateDocument201.pipe(HttpApiSchema.status(201)),
      error: HttpApiSchema.Empty(409),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "DocsController_createDocument")
    .annotate(OpenApi.Summary, "Create guild document")
    .annotate(OpenApi.Description, "Create a new empty guild document"),
  HttpApiEndpoint.get("DocsControllerGetTrash", "/guilds/:guildId/docs/trash", {
    params: DocsControllerGetTrashPathParams,
    success: DocsControllerGetTrash200,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "DocsController_getTrash")
    .annotate(OpenApi.Summary, "Get deleted guild documents")
    .annotate(
      OpenApi.Description,
      "Retrieve guild documents currently in trash",
    ),
  HttpApiEndpoint.get(
    "DocsControllerGetHistory",
    "/guilds/:guildId/docs/:docId/history",
    {
      params: DocsControllerGetHistoryPathParams,
      success: DocsControllerGetHistory200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "DocsController_getHistory")
    .annotate(OpenApi.Summary, "Get guild document history")
    .annotate(
      OpenApi.Description,
      "Retrieve version metadata for a guild document",
    ),
  HttpApiEndpoint.get(
    "DocsControllerGetHistorySnapshot",
    "/guilds/:guildId/docs/:docId/history/:historyId",
    {
      params: DocsControllerGetHistorySnapshotPathParams,
      success: DocsControllerGetHistorySnapshot200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "DocsController_getHistorySnapshot")
    .annotate(OpenApi.Summary, "Get guild document history snapshot")
    .annotate(
      OpenApi.Description,
      "Retrieve a read-only snapshot for a document history entry",
    ),
  HttpApiEndpoint.get(
    "DocsControllerGetDocument",
    "/guilds/:guildId/docs/:docId",
    {
      params: DocsControllerGetDocumentPathParams,
      success: DocsControllerGetDocument200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "DocsController_getDocument")
    .annotate(OpenApi.Summary, "Get guild document")
    .annotate(
      OpenApi.Description,
      "Retrieve a guild document with its current Lexical state",
    ),
  HttpApiEndpoint.put(
    "DocsControllerUpdateDocument",
    "/guilds/:guildId/docs/:docId",
    {
      params: DocsControllerUpdateDocumentPathParams,
      payload: DocsControllerUpdateDocumentRequestJson,
      success: DocsControllerUpdateDocument200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "DocsController_updateDocument")
    .annotate(OpenApi.Summary, "Update guild document")
    .annotate(OpenApi.Description, "Save document title and Lexical state"),
  HttpApiEndpoint.delete(
    "DocsControllerDeleteDocument",
    "/guilds/:guildId/docs/:docId",
    {
      params: DocsControllerDeleteDocumentPathParams,
      success: DocsControllerDeleteDocument200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "DocsController_deleteDocument")
    .annotate(OpenApi.Summary, "Move guild document to trash")
    .annotate(OpenApi.Description, "Soft-delete a guild document"),
  HttpApiEndpoint.post(
    "DocsControllerRestoreDocument",
    "/guilds/:guildId/docs/:docId/restore",
    {
      params: DocsControllerRestoreDocumentPathParams,
      success: DocsControllerRestoreDocument200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "DocsController_restoreDocument")
    .annotate(OpenApi.Summary, "Restore guild document")
    .annotate(OpenApi.Description, "Restore a guild document from trash"),
  HttpApiEndpoint.delete(
    "DocsControllerPurgeDocument",
    "/guilds/:guildId/docs/:docId/purge",
    {
      params: DocsControllerPurgeDocumentPathParams,
      success: DocsControllerPurgeDocument200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "DocsController_purgeDocument")
    .annotate(OpenApi.Summary, "Permanently delete guild document")
    .annotate(
      OpenApi.Description,
      "Permanently delete a guild document from trash",
    ),
) {}
