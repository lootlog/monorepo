import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { AccessPolicy } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { DocsRepository } from "#src/docs/docs.repository";
import { makeDocsService, type DocsService } from "#src/docs/docs.service";
import {
  DocsMutationResponse,
  GuildDocumentHistoryResponse,
  GuildDocumentHistorySnapshotResponse,
  GuildDocumentListResponse,
  GuildDocumentResponse,
  GuildDocumentTrashResponse,
} from "#src/docs/guild-document-response.schema";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { applicationErrorStatusOrUndefined } from "#src/shared/http/http-errors";
import type {
  guildTable,
  memberTable,
  roleTable,
} from "#src/database/drizzle/schema";
import {
  DocsControllerCreateDocument201,
  type DocsControllerCreateDocumentRequestJson,
  DocsControllerDeleteDocument200,
  DocsControllerGetDocument200,
  DocsControllerGetDocuments200,
  DocsControllerGetHistory200,
  DocsControllerGetHistorySnapshot200,
  DocsControllerGetTrash200,
  DocsControllerPurgeDocument200,
  DocsControllerRestoreDocument200,
  DocsControllerUpdateDocument200,
  type DocsControllerUpdateDocumentRequestJson,
} from "../../contracts/docs/schemas.js";
import { LootlogApi } from "../../lootlog-api.js";

type Guild = typeof guildTable.$inferSelect;
type Member = typeof memberTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;

export const docsEndpointIdentifiers = [
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

export interface AuthorizedDocsCaller {
  readonly discordId: string;
  readonly userId: string;
  readonly guild: Guild;
  readonly member: Member;
  readonly accessPolicy: AccessPolicy;
  readonly roles: ReadonlyArray<Role>;
}

export class DocsAccessDenied extends TaggedErrorClass<DocsAccessDenied>()(
  "DocsAccessDenied",
  { status: Schema.Literals([401, 403]), code: Schema.String },
) {}

export class DocsNotFound extends TaggedErrorClass<DocsNotFound>()(
  "DocsNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

export class DocsConflict extends TaggedErrorClass<DocsConflict>()(
  "DocsConflict",
  { status: Schema.Literal(409), code: Schema.String },
) {}

export class DocsInvalidInput extends TaggedErrorClass<DocsInvalidInput>()(
  "DocsInvalidInput",
  { status: Schema.Literal(400), code: Schema.String },
) {}

export class DocsDataError extends TaggedErrorClass<DocsDataError>()(
  "DocsDataError",
  { cause: Schema.Defect() },
) {}

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
    ) => Effect.Effect<AuthorizedDocsCaller, DocsAccessDenied | DocsNotFound>;
  }
>()("@lootlog/api/http-api/docs/authorization") {}

type DocsFailure =
  | DocsConflict
  | DocsDataError
  | DocsInvalidInput
  | DocsNotFound;
type DocsEffect<A> = Effect.Effect<A, DocsFailure>;

export class DocsData extends Context.Service<
  DocsData,
  {
    readonly list: (caller: AuthorizedDocsCaller) => DocsEffect<unknown>;
    readonly create: (
      caller: AuthorizedDocsCaller,
      payload: DocsControllerCreateDocumentRequestJson,
    ) => DocsEffect<unknown>;
    readonly trash: (caller: AuthorizedDocsCaller) => DocsEffect<unknown>;
    readonly history: (
      caller: AuthorizedDocsCaller,
      documentId: string,
    ) => DocsEffect<unknown>;
    readonly historySnapshot: (
      caller: AuthorizedDocsCaller,
      documentId: string,
      historyId: string,
    ) => DocsEffect<unknown>;
    readonly get: (
      caller: AuthorizedDocsCaller,
      documentId: string,
    ) => DocsEffect<unknown>;
    readonly update: (
      caller: AuthorizedDocsCaller,
      documentId: string,
      payload: DocsControllerUpdateDocumentRequestJson,
    ) => DocsEffect<unknown>;
    readonly moveToTrash: (
      caller: AuthorizedDocsCaller,
      documentId: string,
    ) => DocsEffect<unknown>;
    readonly restore: (
      caller: AuthorizedDocsCaller,
      documentId: string,
    ) => DocsEffect<unknown>;
    readonly purge: (
      caller: AuthorizedDocsCaller,
      documentId: string,
    ) => DocsEffect<unknown>;
  }
>()("@lootlog/api/http-api/docs/data") {
  static layer(service: DocsData["Service"]) {
    return Layer.succeed(DocsData, DocsData.of(service));
  }

  static makeService(service: DocsService): DocsData["Service"] {
    const operationFailure = (cause: unknown): DocsFailure => {
      const status = applicationErrorStatusOrUndefined(cause);

      if (status === 404) {
        return new DocsNotFound({ status, code: "DOCS_NOT_FOUND" });
      }
      if (status === 409) {
        return new DocsConflict({ status, code: "DOCS_CONFLICT" });
      }
      if (status === 400) {
        return new DocsInvalidInput({ status, code: "DOCS_INVALID_INPUT" });
      }
      return new DocsDataError({ cause });
    };
    const operation = <A, E>(effect: Effect.Effect<A, E>) =>
      effect.pipe(Effect.mapError(operationFailure));
    const encode = <A, E, Encoded>(
      effect: Effect.Effect<A, E>,
      encoder: (value: A) => Encoded,
    ) => operation(effect).pipe(Effect.map(encoder));
    return DocsData.of({
      list: (caller) =>
        encode(service.listDocuments(caller.guild.id), (value) =>
          encodeUnknownResponse(GuildDocumentListResponse, value),
        ),
      create: (caller, payload) =>
        encode(
          service.createDocument(
            caller.guild.id,
            caller.member.userId,
            payload,
          ),
          (value) => encodeUnknownResponse(GuildDocumentResponse, value),
        ),
      trash: (caller) =>
        encode(service.listTrash(caller.guild.id), (value) =>
          encodeUnknownResponse(GuildDocumentTrashResponse, value),
        ),
      history: (caller, documentId) =>
        encode(service.listHistory(caller.guild.id, documentId), (value) =>
          encodeUnknownResponse(GuildDocumentHistoryResponse, value),
        ),
      historySnapshot: (caller, documentId, historyId) =>
        encode(
          service.getHistorySnapshot(caller.guild.id, documentId, historyId),
          (value) =>
            encodeUnknownResponse(GuildDocumentHistorySnapshotResponse, value),
        ),
      get: (caller, documentId) =>
        encode(service.getDocument(caller.guild.id, documentId), (value) =>
          encodeUnknownResponse(GuildDocumentResponse, value),
        ),
      update: (caller, documentId, payload) =>
        encode(
          service.updateDocument(
            caller.guild.id,
            documentId,
            caller.member.userId,
            payload,
          ),
          (value) => encodeUnknownResponse(GuildDocumentResponse, value),
        ),
      moveToTrash: (caller, documentId) =>
        encode(
          service.moveDocumentToTrash(
            caller.guild.id,
            documentId,
            caller.member.userId,
          ),
          (value) => encodeUnknownResponse(DocsMutationResponse, value),
        ),
      restore: (caller, documentId) =>
        encode(
          service.restoreDocument(
            caller.guild.id,
            documentId,
            caller.member.userId,
          ),
          (value) => encodeUnknownResponse(DocsMutationResponse, value),
        ),
      purge: (caller, documentId) =>
        encode(service.purgeDocument(caller.guild.id, documentId), (value) =>
          encodeUnknownResponse(DocsMutationResponse, value),
        ),
    });
  }

  static readonly layerDatabase = Layer.effect(
    DocsData,
    Effect.map(DocsRepository, (repository) =>
      DocsData.makeService(makeDocsService(repository)),
    ),
  ).pipe(Layer.provide(DocsRepository.layerDatabase));
}

const readRequirement = {
  capabilities: [Permission.LOOTLOG_DOCS_READ, Permission.LOOTLOG_DOCS_WRITE],
  mode: "any",
} as const;
const writeRequirement = {
  capabilities: [Permission.LOOTLOG_DOCS_WRITE],
  mode: "all",
} as const;
const ownerRequirement = {
  capabilities: [Permission.OWNER, Permission.ADMIN],
  mode: "any",
} as const;

const requirementFor = (endpoint: DocsEndpointIdentifier) => {
  if (
    endpoint === "DocsControllerRestoreDocument" ||
    endpoint === "DocsControllerPurgeDocument"
  ) {
    return ownerRequirement;
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

const decode = <A>(decoder: (value: unknown) => A, value: unknown) =>
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
  decoder: (value: unknown) => A,
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

export const listDocuments = (guildId: string) =>
  execute(
    "DocsControllerGetDocuments",
    guildId,
    (data, caller) => data.list(caller),
    Schema.decodeUnknownSync(DocsControllerGetDocuments200),
  );

export const createDocument = (
  guildId: string,
  payload: DocsControllerCreateDocumentRequestJson,
) =>
  execute(
    "DocsControllerCreateDocument",
    guildId,
    (data, caller) => data.create(caller, payload),
    Schema.decodeUnknownSync(DocsControllerCreateDocument201),
  );

export const getTrash = (guildId: string) =>
  execute(
    "DocsControllerGetTrash",
    guildId,
    (data, caller) => data.trash(caller),
    Schema.decodeUnknownSync(DocsControllerGetTrash200),
  );

export const getHistory = (guildId: string, documentId: string) =>
  execute(
    "DocsControllerGetHistory",
    guildId,
    (data, caller) => data.history(caller, documentId),
    Schema.decodeUnknownSync(DocsControllerGetHistory200),
  );

export const getHistorySnapshot = (
  guildId: string,
  documentId: string,
  historyId: string,
) =>
  execute(
    "DocsControllerGetHistorySnapshot",
    guildId,
    (data, caller) => data.historySnapshot(caller, documentId, historyId),
    Schema.decodeUnknownSync(DocsControllerGetHistorySnapshot200),
  );

export const getDocument = (guildId: string, documentId: string) =>
  execute(
    "DocsControllerGetDocument",
    guildId,
    (data, caller) => data.get(caller, documentId),
    Schema.decodeUnknownSync(DocsControllerGetDocument200),
  );

export const updateDocument = (
  guildId: string,
  documentId: string,
  payload: DocsControllerUpdateDocumentRequestJson,
) =>
  execute(
    "DocsControllerUpdateDocument",
    guildId,
    (data, caller) => data.update(caller, documentId, payload),
    Schema.decodeUnknownSync(DocsControllerUpdateDocument200),
  );

export const deleteDocument = (guildId: string, documentId: string) =>
  execute(
    "DocsControllerDeleteDocument",
    guildId,
    (data, caller) => data.moveToTrash(caller, documentId),
    Schema.decodeUnknownSync(DocsControllerDeleteDocument200),
  );

export const restoreDocument = (guildId: string, documentId: string) =>
  execute(
    "DocsControllerRestoreDocument",
    guildId,
    (data, caller) => data.restore(caller, documentId),
    Schema.decodeUnknownSync(DocsControllerRestoreDocument200),
  );

export const purgeDocument = (guildId: string, documentId: string) =>
  execute(
    "DocsControllerPurgeDocument",
    guildId,
    (data, caller) => data.purge(caller, documentId),
    Schema.decodeUnknownSync(DocsControllerPurgeDocument200),
  );

const toHttpResponse = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => {
    if (
      error instanceof DocsAccessDenied ||
      error instanceof DocsConflict ||
      error instanceof DocsInvalidInput ||
      error instanceof DocsNotFound
    ) {
      return Effect.succeed(HttpServerResponse.empty({ status: error.status }));
    }
    return Effect.die(error);
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
