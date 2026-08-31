import type { JsonValue as DatabaseJsonValue } from "@prisma/orm-postgres/target/codec-types";
import { and } from "@prisma/orm-family-sql/orm-client";
import { createId } from "@paralleldrive/cuid2";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import {
  GUILD_DOCUMENT_CONTENT_MAX_LENGTH,
  GUILD_DOCUMENT_DEFAULT_LIMIT,
  GUILD_DOCUMENT_TITLE_MAX_LENGTH,
} from "./constants/docs-limits.js";
import type { CreateGuildDocumentDto } from "./dto/create-guild-document.dto.js";
import type { UpdateGuildDocumentDto } from "./dto/update-guild-document.dto.js";
import type { GuildDocumentContent } from "./dto/guild-document-content.schema.js";

type InputJsonValue = DatabaseJsonValue;
type JsonValue = DatabaseJsonValue;

const EMPTY_DOCUMENT_CONTENT = {
  root: {
    children: [
      {
        children: [],
        direction: null,
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
} satisfies InputJsonValue;

type DocumentRecord = {
  id: string;
  guildId: string;
  title: string;
  content?: JsonValue;
  version: number;
  createdByMemberId: string;
  updatedByMemberId: string;
  deletedAt?: Date | null;
  deletedByMemberId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type HistoryRecord = {
  id: string;
  documentId: string;
  guildId: string;
  version: number;
  title: string;
  content?: JsonValue;
  action: "SAVE" | "DELETE" | "RESTORE";
  actorMemberId: string;
  editedAt: Date;
};

@Injectable()
export class DocsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDocuments(guildId: string) {
    const [guild, used, trashed, documents] = await Promise.all([
      this.prisma.db.orm.public.Guild.where((row) => row.id.eq(guildId))
        .select("documentLimit")
        .first(),
      this.prisma.db.orm.public.GuildDocument.where((row) =>
        row.guildId.eq(guildId),
      ).count(),
      this.prisma.db.orm.public.GuildDocument.where((row) =>
        and(row.guildId.eq(guildId), row.deletedAt.isNotNull()),
      ).count(),
      this.prisma.db.orm.public.GuildDocument.where((row) =>
        and(row.guildId.eq(guildId), row.deletedAt.isNull()),
      )
        .select(
          "id",
          "guildId",
          "title",
          "version",
          "createdByMemberId",
          "updatedByMemberId",
          "createdAt",
          "updatedAt",
        )
        .orderBy((row) => row.updatedAt.desc())
        .all(),
    ]);

    if (!guild) {
      throw new NotFoundException("Guild not found");
    }

    const max = this.resolveDocumentLimit(guild.documentLimit);

    return {
      items: await this.mapDocumentRecords(guildId, documents),
      limit: {
        used,
        max,
        trashed,
        canCreate: used < max,
      },
    };
  }

  async createDocument(
    guildId: string,
    memberId: string,
    data: CreateGuildDocumentDto,
  ) {
    const title = this.normalizeTitle(data.title);

    const document = await this.prisma.db.transaction(async (tx) => {
      const guild = await tx.orm.public.Guild.where((row) => row.id.eq(guildId))
        .select("documentLimit")
        .first();

      if (!guild) {
        throw new NotFoundException("Guild not found");
      }

      const max = this.resolveDocumentLimit(guild.documentLimit);
      const used = await tx.orm.public.GuildDocument.where((row) =>
        row.guildId.eq(guildId),
      ).count();

      if (used >= max) {
        throw new ConflictException("Guild document limit reached");
      }

      const createdDocument = await tx.orm.public.GuildDocument.create({
        id: createId(),
        guildId,
        title,
        content: EMPTY_DOCUMENT_CONTENT,
        createdByMemberId: memberId,
        updatedByMemberId: memberId,
        updatedAt: new Date(),
      });

      await tx.orm.public.GuildDocumentHistory.create({
        id: createId(),
        documentId: createdDocument.id,
        guildId,
        version: createdDocument.version,
        title: createdDocument.title,
        content: createdDocument.content as InputJsonValue,
        action: "SAVE",
        actorMemberId: memberId,
      });

      return createdDocument;
    });

    return this.mapDocumentRecord(guildId, document, {
      includeContent: true,
    });
  }

  async getDocument(guildId: string, documentId: string) {
    const document = await this.findDocumentOrThrow(guildId, documentId);

    return this.mapDocumentRecord(guildId, document, {
      includeContent: true,
    });
  }

  async updateDocument(
    guildId: string,
    documentId: string,
    memberId: string,
    data: UpdateGuildDocumentDto,
  ) {
    const title = this.normalizeTitle(data.title);
    const content = this.normalizeContent(data.content);

    const updatedDocument = await this.prisma.db.transaction(async (tx) => {
      const document = await tx.orm.public.GuildDocument.where((row) =>
        and(
          row.id.eq(documentId),
          row.guildId.eq(guildId),
          row.deletedAt.isNull(),
        ),
      ).first();

      if (!document) {
        throw new NotFoundException("Document not found");
      }

      if (
        document.title === title &&
        this.stringifyContent(document.content) ===
          this.stringifyContent(content)
      ) {
        return document;
      }

      const updated = await tx.orm.public.GuildDocument.where((row) =>
        row.id.eq(documentId),
      ).update({
        title,
        content: content as InputJsonValue,
        updatedByMemberId: memberId,
        version: document.version + 1,
        updatedAt: new Date(),
      });

      await tx.orm.public.GuildDocumentHistory.create({
        id: createId(),
        documentId,
        guildId,
        version: updated.version,
        title: updated.title,
        content: updated.content as InputJsonValue,
        action: "SAVE",
        actorMemberId: memberId,
      });

      return updated;
    });

    return this.mapDocumentRecord(guildId, updatedDocument, {
      includeContent: true,
    });
  }

  async listHistory(guildId: string, documentId: string) {
    await this.findDocumentOrThrow(guildId, documentId);

    const history = await this.prisma.db.orm.public.GuildDocumentHistory.where(
      (row) => and(row.documentId.eq(documentId), row.guildId.eq(guildId)),
    )
      .select(
        "id",
        "documentId",
        "guildId",
        "version",
        "title",
        "action",
        "actorMemberId",
        "editedAt",
      )
      .orderBy((row) => row.editedAt.desc())
      .all();

    return {
      items: await this.mapHistoryRecords(guildId, history),
    };
  }

  async getHistorySnapshot(
    guildId: string,
    documentId: string,
    historyId: string,
  ) {
    await this.findDocumentOrThrow(guildId, documentId);

    const history = await this.prisma.db.orm.public.GuildDocumentHistory.where(
      (row) =>
        and(
          row.id.eq(historyId),
          row.documentId.eq(documentId),
          row.guildId.eq(guildId),
        ),
    ).first();

    if (!history) {
      throw new NotFoundException("Document history not found");
    }

    return this.mapHistoryRecord(guildId, history, {
      includeContent: true,
    });
  }

  async listTrash(guildId: string) {
    const documents = await this.prisma.db.orm.public.GuildDocument.where(
      (row) => and(row.guildId.eq(guildId), row.deletedAt.isNotNull()),
    )
      .select(
        "id",
        "guildId",
        "title",
        "version",
        "createdByMemberId",
        "updatedByMemberId",
        "deletedAt",
        "deletedByMemberId",
        "createdAt",
        "updatedAt",
      )
      .orderBy((row) => row.deletedAt.desc())
      .all();

    return {
      items: await this.mapTrashDocumentRecords(guildId, documents),
    };
  }

  async moveDocumentToTrash(
    guildId: string,
    documentId: string,
    memberId: string,
  ) {
    await this.prisma.db.transaction(async (tx) => {
      const document = await tx.orm.public.GuildDocument.where((row) =>
        and(
          row.id.eq(documentId),
          row.guildId.eq(guildId),
          row.deletedAt.isNull(),
        ),
      ).first();

      if (!document) {
        throw new NotFoundException("Document not found");
      }

      const deletedDocument = await tx.orm.public.GuildDocument.where((row) =>
        row.id.eq(documentId),
      ).update({
        deletedAt: new Date(),
        deletedByMemberId: memberId,
        updatedByMemberId: memberId,
        updatedAt: new Date(),
      });

      await tx.orm.public.GuildDocumentHistory.create({
        id: createId(),
        documentId,
        guildId,
        version: deletedDocument.version,
        title: deletedDocument.title,
        content: deletedDocument.content as InputJsonValue,
        action: "DELETE",
        actorMemberId: memberId,
      });
    });

    return { success: true };
  }

  async restoreDocument(guildId: string, documentId: string, memberId: string) {
    await this.prisma.db.transaction(async (tx) => {
      const document = await tx.orm.public.GuildDocument.where((row) =>
        and(row.id.eq(documentId), row.guildId.eq(guildId)),
      ).first();

      if (!document) {
        throw new NotFoundException("Document not found");
      }

      if (!document.deletedAt) {
        throw new ConflictException("Document is not in trash");
      }

      const restoredDocument = await tx.orm.public.GuildDocument.where((row) =>
        row.id.eq(documentId),
      ).update({
        deletedAt: null,
        deletedByMemberId: null,
        updatedByMemberId: memberId,
        updatedAt: new Date(),
      });

      await tx.orm.public.GuildDocumentHistory.create({
        id: createId(),
        documentId,
        guildId,
        version: restoredDocument.version,
        title: restoredDocument.title,
        content: restoredDocument.content as InputJsonValue,
        action: "RESTORE",
        actorMemberId: memberId,
      });
    });

    return { success: true };
  }

  async purgeDocument(guildId: string, documentId: string) {
    const document = await this.prisma.db.orm.public.GuildDocument.where(
      (row) => and(row.id.eq(documentId), row.guildId.eq(guildId)),
    )
      .select("id", "deletedAt")
      .first();

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    if (!document.deletedAt) {
      throw new ConflictException("Document is not in trash");
    }

    await this.prisma.db.orm.public.GuildDocument.where((row) =>
      row.id.eq(documentId),
    ).delete();

    return { success: true };
  }

  private async findDocumentOrThrow(guildId: string, documentId: string) {
    const document = await this.prisma.db.orm.public.GuildDocument.where(
      (row) =>
        and(
          row.id.eq(documentId),
          row.guildId.eq(guildId),
          row.deletedAt.isNull(),
        ),
    ).first();

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    return document;
  }

  private resolveDocumentLimit(limit: number | null | undefined) {
    return Math.max(0, limit ?? GUILD_DOCUMENT_DEFAULT_LIMIT);
  }

  private normalizeTitle(title: string) {
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      throw new BadRequestException("Document title is required");
    }

    if (normalizedTitle.length > GUILD_DOCUMENT_TITLE_MAX_LENGTH) {
      throw new BadRequestException("Document title is too long");
    }

    return normalizedTitle;
  }

  private normalizeContent(content: GuildDocumentContent) {
    const stringifiedContent = this.stringifyContent(content);

    if (stringifiedContent.length > GUILD_DOCUMENT_CONTENT_MAX_LENGTH) {
      throw new BadRequestException("Document content is too long");
    }

    return content;
  }

  private stringifyContent(content: JsonValue) {
    try {
      return JSON.stringify(content);
    } catch {
      throw new BadRequestException("Document content is not serializable");
    }
  }

  private async mapDocumentRecords(
    guildId: string,
    documents: DocumentRecord[],
  ) {
    const editorNameByMemberId = await this.getEditorNameByMemberId(
      guildId,
      documents.flatMap((document) => [
        document.createdByMemberId,
        document.updatedByMemberId,
      ]),
    );

    return documents.map((document) =>
      this.mapDocumentRecordWithEditors(document, editorNameByMemberId),
    );
  }

  private async mapTrashDocumentRecords(
    guildId: string,
    documents: DocumentRecord[],
  ) {
    const editorNameByMemberId = await this.getEditorNameByMemberId(
      guildId,
      documents.flatMap((document) => [
        document.createdByMemberId,
        document.updatedByMemberId,
        document.deletedByMemberId ?? document.updatedByMemberId,
      ]),
    );

    return documents.map((document) => {
      const deletedByMemberId =
        document.deletedByMemberId ?? document.updatedByMemberId;

      return {
        ...this.mapDocumentRecordWithEditors(document, editorNameByMemberId),
        deletedAt: document.deletedAt ?? document.updatedAt,
        deletedByMemberId,
        deletedBy: {
          memberId: deletedByMemberId,
          name: editorNameByMemberId.get(deletedByMemberId) ?? null,
        },
      };
    });
  }

  private async mapDocumentRecord(
    guildId: string,
    document: DocumentRecord,
    options: { includeContent: true },
  ) {
    const [mappedDocument] = await this.mapDocumentRecords(guildId, [document]);

    return {
      ...mappedDocument,
      content: options.includeContent ? document.content : undefined,
    };
  }

  private mapDocumentRecordWithEditors(
    document: DocumentRecord,
    editorNameByMemberId: Map<string, string>,
  ) {
    return {
      id: document.id,
      guildId: document.guildId,
      title: document.title,
      version: document.version,
      createdByMemberId: document.createdByMemberId,
      createdBy: {
        memberId: document.createdByMemberId,
        name: editorNameByMemberId.get(document.createdByMemberId) ?? null,
      },
      updatedByMemberId: document.updatedByMemberId,
      updatedBy: {
        memberId: document.updatedByMemberId,
        name: editorNameByMemberId.get(document.updatedByMemberId) ?? null,
      },
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  private async mapHistoryRecords(guildId: string, history: HistoryRecord[]) {
    const editorNameByMemberId = await this.getEditorNameByMemberId(
      guildId,
      history.map((entry) => entry.actorMemberId),
    );

    return history.map((entry) =>
      this.mapHistoryRecordWithEditors(entry, editorNameByMemberId),
    );
  }

  private async mapHistoryRecord(
    guildId: string,
    history: HistoryRecord,
    options: { includeContent: true },
  ) {
    const [mappedHistory] = await this.mapHistoryRecords(guildId, [history]);

    return {
      ...mappedHistory,
      content: options.includeContent ? history.content : undefined,
    };
  }

  private mapHistoryRecordWithEditors(
    history: HistoryRecord,
    editorNameByMemberId: Map<string, string>,
  ) {
    return {
      id: history.id,
      documentId: history.documentId,
      guildId: history.guildId,
      version: history.version,
      title: history.title,
      action: history.action,
      actorMemberId: history.actorMemberId,
      actor: {
        memberId: history.actorMemberId,
        name: editorNameByMemberId.get(history.actorMemberId) ?? null,
      },
      editedAt: history.editedAt,
    };
  }

  private async getEditorNameByMemberId(guildId: string, memberIds: string[]) {
    const uniqueMemberIds = Array.from(new Set(memberIds));

    if (uniqueMemberIds.length === 0) {
      return new Map<string, string>();
    }

    const editors = (await this.prisma.db.orm.public.Member.where((row) =>
      and(row.guildId.eq(guildId), row.userId.in(uniqueMemberIds)),
    )
      .select("userId", "name")
      .all()) as Array<{ userId: string; name: string }>;

    return new Map(editors.map((editor) => [editor.userId, editor.name]));
  }
}
