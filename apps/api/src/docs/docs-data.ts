import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { Context, Effect, Layer, Schema } from "effect";
import { DocsRepository } from "./docs.repository.js";
import { makeDocsService, type DocsService } from "./docs.service.js";
import {
  DocsMutationResponse,
  GuildDocumentHistoryResponse,
  GuildDocumentHistorySnapshotResponse,
  GuildDocumentListResponse,
  GuildDocumentResponse,
  GuildDocumentTrashResponse,
} from "./guild-document-response.schema.js";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { applicationErrorStatusOrUndefined } from "#src/shared/http/http-errors";
import type {
  guildTable,
  memberTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
} from "#src/contracts/docs/schemas";

type Guild = typeof guildTable.$inferSelect;

type Member = typeof memberTable.$inferSelect;

type Role = typeof roleTable.$inferSelect;

export interface AuthorizedDocsCaller {
  readonly discordId: string;
  readonly userId: string;
  readonly guild: Guild;
  readonly member: Member;
  readonly accessPolicy: AccessPolicy;
  readonly roles: ReadonlyArray<Role>;
}

export class DocsNotFound extends TaggedErrorClass<DocsNotFound>()(
  "DocsNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

export class DocsConflict extends TaggedErrorClass<DocsConflict>()(
  "DocsConflict",
  { status: Schema.Literal(409), code: Schema.String },
) {}

class DocsInvalidInput extends TaggedErrorClass<DocsInvalidInput>()(
  "DocsInvalidInput",
  { status: Schema.Literal(400), code: Schema.String },
) {}

export class DocsDataError extends TaggedErrorClass<DocsDataError>()(
  "DocsDataError",
  {
    cause: Schema.Defect(),
  },
) {}

export type DocsFailure =
  | DocsConflict
  | DocsDataError
  | DocsInvalidInput
  | DocsNotFound;

export type DocsEffect<A> = Effect.Effect<A, DocsFailure>;

export class DocsData extends Context.Service<
  DocsData,
  {
    readonly list: (caller: AuthorizedDocsCaller) => DocsEffect<unknown>;
    readonly create: (
      caller: AuthorizedDocsCaller,
      payload: CreateDocumentRequest,
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
      payload: UpdateDocumentRequest,
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
