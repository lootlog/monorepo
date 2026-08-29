import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "#src/generated/prisma/client";
import { PrismaService } from "#src/db/prisma.service";
import {
  GUILD_DOCUMENT_CONTENT_MAX_LENGTH,
  GUILD_DOCUMENT_DEFAULT_LIMIT,
  GUILD_DOCUMENT_TITLE_MAX_LENGTH,
} from "./constants/docs-limits.js";
import type { CreateGuildDocumentDto } from "./dto/create-guild-document.dto.js";
import type { UpdateGuildDocumentDto } from "./dto/update-guild-document.dto.js";
import type { GuildDocumentContent } from "./dto/guild-document-content.schema.js";

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
} satisfies Prisma.InputJsonValue;

type DocumentRecord = {
  id: string;
  guildId: string;
  title: string;
  content?: Prisma.JsonValue;
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
  content?: Prisma.JsonValue;
  action: "SAVE" | "DELETE" | "RESTORE";
  actorMemberId: string;
  editedAt: Date;
};

@Injectable()
export class DocsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDocuments(guildId: string) {
    const [guild, used, trashed, documents] = await Promise.all([
      this.prisma.guild.findUnique({
        where: { id: guildId },
        select: { documentLimit: true },
      }),
      this.prisma.guildDocument.count({
        where: { guildId },
      }),
      this.prisma.guildDocument.count({
        where: { guildId, deletedAt: { not: null } },
      }),
      this.prisma.guildDocument.findMany({
        where: { guildId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          guildId: true,
          title: true,
          version: true,
          createdByMemberId: true,
          updatedByMemberId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
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

    const document = await this.prisma.$transaction(async (tx) => {
      const guild = await tx.guild.findUnique({
        where: { id: guildId },
        select: { documentLimit: true },
      });

      if (!guild) {
        throw new NotFoundException("Guild not found");
      }

      const max = this.resolveDocumentLimit(guild.documentLimit);
      const used = await tx.guildDocument.count({
        where: { guildId },
      });

      if (used >= max) {
        throw new ConflictException("Guild document limit reached");
      }

      const createdDocument = await tx.guildDocument.create({
        data: {
          guildId,
          title,
          content: EMPTY_DOCUMENT_CONTENT,
          createdByMemberId: memberId,
          updatedByMemberId: memberId,
        },
      });

      await tx.guildDocumentHistory.create({
        data: {
          documentId: createdDocument.id,
          guildId,
          version: createdDocument.version,
          title: createdDocument.title,
          content: createdDocument.content as Prisma.InputJsonValue,
          action: "SAVE",
          actorMemberId: memberId,
        },
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

    const updatedDocument = await this.prisma.$transaction(async (tx) => {
      const document = await tx.guildDocument.findFirst({
        where: { id: documentId, guildId, deletedAt: null },
      });

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

      const updated = await tx.guildDocument.update({
        where: { id: documentId },
        data: {
          title,
          content: content as Prisma.InputJsonValue,
          updatedByMemberId: memberId,
          version: { increment: 1 },
        },
      });

      await tx.guildDocumentHistory.create({
        data: {
          documentId,
          guildId,
          version: updated.version,
          title: updated.title,
          content: updated.content as Prisma.InputJsonValue,
          action: "SAVE",
          actorMemberId: memberId,
        },
      });

      return updated;
    });

    return this.mapDocumentRecord(guildId, updatedDocument, {
      includeContent: true,
    });
  }

  async listHistory(guildId: string, documentId: string) {
    await this.findDocumentOrThrow(guildId, documentId);

    const history = await this.prisma.guildDocumentHistory.findMany({
      where: { documentId, guildId },
      orderBy: { editedAt: "desc" },
      select: {
        id: true,
        documentId: true,
        guildId: true,
        version: true,
        title: true,
        action: true,
        actorMemberId: true,
        editedAt: true,
      },
    });

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

    const history = await this.prisma.guildDocumentHistory.findFirst({
      where: {
        id: historyId,
        documentId,
        guildId,
      },
    });

    if (!history) {
      throw new NotFoundException("Document history not found");
    }

    return this.mapHistoryRecord(guildId, history, {
      includeContent: true,
    });
  }

  async listTrash(guildId: string) {
    const documents = await this.prisma.guildDocument.findMany({
      where: { guildId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: {
        id: true,
        guildId: true,
        title: true,
        version: true,
        createdByMemberId: true,
        updatedByMemberId: true,
        deletedAt: true,
        deletedByMemberId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      items: await this.mapTrashDocumentRecords(guildId, documents),
    };
  }

  async moveDocumentToTrash(
    guildId: string,
    documentId: string,
    memberId: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const document = await tx.guildDocument.findFirst({
        where: { id: documentId, guildId, deletedAt: null },
      });

      if (!document) {
        throw new NotFoundException("Document not found");
      }

      const deletedDocument = await tx.guildDocument.update({
        where: { id: documentId },
        data: {
          deletedAt: new Date(),
          deletedByMemberId: memberId,
          updatedByMemberId: memberId,
        },
      });

      await tx.guildDocumentHistory.create({
        data: {
          documentId,
          guildId,
          version: deletedDocument.version,
          title: deletedDocument.title,
          content: deletedDocument.content as Prisma.InputJsonValue,
          action: "DELETE",
          actorMemberId: memberId,
        },
      });
    });

    return { success: true };
  }

  async restoreDocument(guildId: string, documentId: string, memberId: string) {
    await this.prisma.$transaction(async (tx) => {
      const document = await tx.guildDocument.findFirst({
        where: { id: documentId, guildId },
      });

      if (!document) {
        throw new NotFoundException("Document not found");
      }

      if (!document.deletedAt) {
        throw new ConflictException("Document is not in trash");
      }

      const restoredDocument = await tx.guildDocument.update({
        where: { id: documentId },
        data: {
          deletedAt: null,
          deletedByMemberId: null,
          updatedByMemberId: memberId,
        },
      });

      await tx.guildDocumentHistory.create({
        data: {
          documentId,
          guildId,
          version: restoredDocument.version,
          title: restoredDocument.title,
          content: restoredDocument.content as Prisma.InputJsonValue,
          action: "RESTORE",
          actorMemberId: memberId,
        },
      });
    });

    return { success: true };
  }

  async purgeDocument(guildId: string, documentId: string) {
    const document = await this.prisma.guildDocument.findFirst({
      where: { id: documentId, guildId },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    if (!document.deletedAt) {
      throw new ConflictException("Document is not in trash");
    }

    await this.prisma.guildDocument.delete({
      where: { id: documentId },
    });

    return { success: true };
  }

  private async findDocumentOrThrow(guildId: string, documentId: string) {
    const document = await this.prisma.guildDocument.findFirst({
      where: { id: documentId, guildId, deletedAt: null },
    });

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

  private stringifyContent(content: Prisma.JsonValue) {
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

    const editors = await this.prisma.member.findMany({
      where: {
        guildId,
        userId: {
          in: uniqueMemberIds,
        },
      },
      select: {
        userId: true,
        name: true,
      },
    });

    return new Map(editors.map((editor) => [editor.userId, editor.name]));
  }
}
