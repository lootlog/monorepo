import type { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  type ReauthenticationRequired,
  reauthenticationRequiredResponse,
} from "@lootlog/protocol/http/errors";
import {
  type AuthorizedDocsCaller,
  DocsNotFound,
  DocsDataError,
  type DocsFailure,
  type DocsEffect,
  DocsData,
} from "#src/docs/docs-data";
import type { BoundaryDecoder } from "#src/shared/schema/json";
import { statusCodeResponse } from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { AccessRequirement } from "@lootlog/domain/access-policy";
import {
  Capability,
  type Capability as PermissionValue,
} from "@lootlog/schema/permissions";
import { Context, Effect, Schema } from "effect";

import { HttpApiBuilder } from "effect/http-api";

import {
  DocumentResponse,
  DocumentMutationResponse,
  DocumentListResponse,
  DocumentHistoryResponse,
  DocumentHistorySnapshotResponse,
  DocumentTrashResponse,
  type CreateDocumentRequest,
  type UpdateDocumentRequest,
} from "#src/contracts/docs/schemas";

import { LootlogApi } from "../../lootlog-api.js";

const docsEndpointIdentifiers = [
  "DocsControllerGetDocuments",
  "DocsControllerCreateDocument",
  "DocsControllerGetTrash",
  "DocsControllerGetHistory",
  "DocsControllerGetHistorySnapshot",
  "DocsControllerGetDocument",
  "DocsControllerUpdateDocument",
  "DocsControllerDeleteDocument",
  "DocsControllerRestoreDocument",
  "DocsControllerPurgeDocument",
] as const;

export type DocsEndpointIdentifier = (typeof docsEndpointIdentifiers)[number];

export class DocsAccessDenied extends TaggedErrorClass<
  DocsAccessDenied,
  { readonly brand: unique symbol }
>()("DocsAccessDenied", {
  status: Schema.Literals([401, 403]),
  code: Schema.String,
}) {}

export interface DocsAuthorizationRequirement {
  readonly guildId: string;
  readonly capabilities: ReadonlyArray<PermissionValue>;
  readonly mode: "all" | "any";
}

export class DocsAuthorization extends Context.Service<
  DocsAuthorization,
  {
    readonly requireGuild: (
      requirement: DocsAuthorizationRequirement,
    ) => Effect.Effect<
      AuthorizedDocsCaller,
      DocsAccessDenied | DocsNotFound | ReauthenticationRequired,
      ForwardAuthIdentity
    >;
  }
>()("@lootlog/api/http-api/docs/authorization") {}

type DocsHttpFailure =
  | DocsAccessDenied
  | DocsFailure
  | ReauthenticationRequired;

const readRequirement = {
  capabilities: [Capability.LOOTLOG_DOCS_READ, Capability.LOOTLOG_DOCS_WRITE],
  mode: "any",
} as const;

const writeRequirement = {
  capabilities: [Capability.LOOTLOG_DOCS_WRITE],
  mode: "all",
} as const;

const administerRequirement = {
  capabilities: AccessRequirement.ADMINISTER,
  mode: "any",
} as const;

const requirementFor = (endpoint: DocsEndpointIdentifier) => {
  if (
    endpoint === "DocsControllerRestoreDocument" ||
    endpoint === "DocsControllerPurgeDocument"
  ) {
    return administerRequirement;
  }

  if (
    endpoint === "DocsControllerGetDocuments" ||
    endpoint === "DocsControllerGetDocument"
  ) {
    return readRequirement;
  }

  return writeRequirement;
};

const authorize = (endpoint: DocsEndpointIdentifier, guildId: string) =>
  Effect.flatMap(DocsAuthorization, (authorization) =>
    authorization.requireGuild({ guildId, ...requirementFor(endpoint) }),
  );

const decode = <A>(decoder: BoundaryDecoder<A>, value: unknown) =>
  Effect.try({
    try: () => decoder(value),
    catch: (cause) => new DocsDataError({ cause }),
  });

const execute = <A>(
  endpoint: DocsEndpointIdentifier,
  guildId: string,
  operation: (
    data: DocsData["Service"],
    caller: AuthorizedDocsCaller,
  ) => DocsEffect<unknown>,
  decoder: BoundaryDecoder<A>,
) =>
  Effect.gen(function* () {
    const caller = yield* authorize(endpoint, guildId);

    const value = yield* Effect.flatMap(DocsData, (data) =>
      operation(data, caller),
    );

    return yield* decode(decoder, value);
  }).pipe(
    Effect.withSpan(endpoint, {
      attributes: { operationId: endpoint },
    }),
  );

const listDocuments = (guildId: string) =>
  execute(
    "DocsControllerGetDocuments",
    guildId,
    (data, caller) => data.list(caller),
    Schema.decodeUnknownSync(DocumentListResponse),
  );

export const createDocument = (
  guildId: string,
  payload: CreateDocumentRequest,
) =>
  execute(
    "DocsControllerCreateDocument",
    guildId,
    (data, caller) => data.create(caller, payload),
    Schema.decodeUnknownSync(DocumentResponse),
  );

const getTrash = (guildId: string) =>
  execute(
    "DocsControllerGetTrash",
    guildId,
    (data, caller) => data.trash(caller),
    Schema.decodeUnknownSync(DocumentTrashResponse),
  );

export const getHistory = (guildId: string, documentId: string) =>
  execute(
    "DocsControllerGetHistory",
    guildId,
    (data, caller) => data.history(caller, documentId),
    Schema.decodeUnknownSync(DocumentHistoryResponse),
  );

const getHistorySnapshot = (
  guildId: string,
  documentId: string,
  historyId: string,
) =>
  execute(
    "DocsControllerGetHistorySnapshot",
    guildId,
    (data, caller) => data.historySnapshot(caller, documentId, historyId),
    Schema.decodeUnknownSync(DocumentHistorySnapshotResponse),
  );

export const getDocument = (guildId: string, documentId: string) =>
  execute(
    "DocsControllerGetDocument",
    guildId,
    (data, caller) => data.get(caller, documentId),
    Schema.decodeUnknownSync(DocumentResponse),
  );

export const updateDocument = (
  guildId: string,
  documentId: string,
  payload: UpdateDocumentRequest,
) =>
  execute(
    "DocsControllerUpdateDocument",
    guildId,
    (data, caller) => data.update(caller, documentId, payload),
    Schema.decodeUnknownSync(DocumentResponse),
  );

const deleteDocument = (guildId: string, documentId: string) =>
  execute(
    "DocsControllerDeleteDocument",
    guildId,
    (data, caller) => data.moveToTrash(caller, documentId),
    Schema.decodeUnknownSync(DocumentMutationResponse),
  );

export const restoreDocument = (guildId: string, documentId: string) =>
  execute(
    "DocsControllerRestoreDocument",
    guildId,
    (data, caller) => data.restore(caller, documentId),
    Schema.decodeUnknownSync(DocumentMutationResponse),
  );

const purgeDocument = (guildId: string, documentId: string) =>
  execute(
    "DocsControllerPurgeDocument",
    guildId,
    (data, caller) => data.purge(caller, documentId),
    Schema.decodeUnknownSync(DocumentMutationResponse),
  );

const toHttpResponse = <A, R>(effect: Effect.Effect<A, DocsHttpFailure, R>) =>
  Effect.catchTags(effect, {
    DocsAccessDenied: statusCodeResponse,
    ReauthenticationRequired: reauthenticationRequiredResponse,
    DocsConflict: statusCodeResponse,
    DocsDataError: (error) => Effect.die(error.cause),
    DocsInvalidInput: statusCodeResponse,
    DocsNotFound: statusCodeResponse,
  });

export const DocsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "docs",
  (handlers) =>
    handlers
      .handle("DocsControllerGetDocuments", ({ params }) =>
        toHttpResponse(listDocuments(params.guildId)),
      )
      .handle("DocsControllerCreateDocument", ({ params, payload }) =>
        toHttpResponse(createDocument(params.guildId, payload)),
      )
      .handle("DocsControllerGetTrash", ({ params }) =>
        toHttpResponse(getTrash(params.guildId)),
      )
      .handle("DocsControllerGetHistory", ({ params }) =>
        toHttpResponse(getHistory(params.guildId, params.docId)),
      )
      .handle("DocsControllerGetHistorySnapshot", ({ params }) =>
        toHttpResponse(
          getHistorySnapshot(params.guildId, params.docId, params.historyId),
        ),
      )
      .handle("DocsControllerGetDocument", ({ params }) =>
        toHttpResponse(getDocument(params.guildId, params.docId)),
      )
      .handle("DocsControllerUpdateDocument", ({ params, payload }) =>
        toHttpResponse(updateDocument(params.guildId, params.docId, payload)),
      )
      .handle("DocsControllerDeleteDocument", ({ params }) =>
        toHttpResponse(deleteDocument(params.guildId, params.docId)),
      )
      .handle("DocsControllerRestoreDocument", ({ params }) =>
        toHttpResponse(restoreDocument(params.guildId, params.docId)),
      )
      .handle("DocsControllerPurgeDocument", ({ params }) =>
        toHttpResponse(purgeDocument(params.guildId, params.docId)),
      ),
);
