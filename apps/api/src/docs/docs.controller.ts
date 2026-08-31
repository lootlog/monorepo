import { db as prismaDb } from "#src/prisma/db";
import type { FieldOutputTypes } from "../prisma/contract.js";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { GuildData } from "#src/shared/decorators/guild-data.decorator";
import { GuildMember } from "#src/shared/decorators/member.decorator";
import { AuthGuard } from "@lootlog/nest-shared";
import { Permissions } from "#src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";
import { DocsService } from "./docs.service.js";
import { CreateGuildDocumentDto } from "./dto/create-guild-document.dto.js";
import { UpdateGuildDocumentDto } from "./dto/update-guild-document.dto.js";
import {
  DocsMutationResponseDto,
  GuildDocumentHistoryResponseDto,
  GuildDocumentHistorySnapshotResponseDto,
  GuildDocumentListResponseDto,
  GuildDocumentResponseDto,
  GuildDocumentTrashResponseDto,
} from "./dto/guild-document-response.dto.js";

type Guild = FieldOutputTypes["public"]["Guild"];
type Member = FieldOutputTypes["public"]["Member"];
const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

const DOCS_READ_PERMISSIONS = [
  Permission.LOOTLOG_DOCS_READ,
  Permission.LOOTLOG_DOCS_WRITE,
];

@ApiTags("docs")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("guilds/:guildId/docs")
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  @Permissions(...DOCS_READ_PERMISSIONS)
  @UseGuards(PermissionsGuard)
  @Get()
  @ApiOperation({
    summary: "Get guild documents",
    description: "Retrieve document summaries for a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ZodResponse({
    status: 200,
    description: "List of guild documents",
    type: GuildDocumentListResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  getDocuments(@GuildData() guild: Guild) {
    return this.docsService.listDocuments(guild.id);
  }

  @Permissions(Permission.LOOTLOG_DOCS_WRITE)
  @UseGuards(PermissionsGuard)
  @Post()
  @ApiOperation({
    summary: "Create guild document",
    description: "Create a new empty guild document",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ZodResponse({
    status: 201,
    description: "Document created successfully",
    type: GuildDocumentResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "Guild document limit reached",
  })
  createDocument(
    @GuildData() guild: Guild,
    @GuildMember() member: Member,
    @Body() data: CreateGuildDocumentDto,
  ) {
    return this.docsService.createDocument(guild.id, member.userId, data);
  }

  @Permissions(Permission.LOOTLOG_DOCS_WRITE)
  @UseGuards(PermissionsGuard)
  @Get("trash")
  @ApiOperation({
    summary: "Get deleted guild documents",
    description: "Retrieve guild documents currently in trash",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ZodResponse({
    status: 200,
    description: "Deleted guild documents",
    type: GuildDocumentTrashResponseDto,
  })
  getTrash(@GuildData() guild: Guild) {
    return this.docsService.listTrash(guild.id);
  }

  @Permissions(Permission.LOOTLOG_DOCS_WRITE)
  @UseGuards(PermissionsGuard)
  @Get(":docId/history")
  @ApiOperation({
    summary: "Get guild document history",
    description: "Retrieve version metadata for a guild document",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "docId", description: "Document ID" })
  @ZodResponse({
    status: 200,
    description: "Document history",
    type: GuildDocumentHistoryResponseDto,
  })
  getHistory(@GuildData() guild: Guild, @Param("docId") documentId: string) {
    return this.docsService.listHistory(guild.id, documentId);
  }

  @Permissions(Permission.LOOTLOG_DOCS_WRITE)
  @UseGuards(PermissionsGuard)
  @Get(":docId/history/:historyId")
  @ApiOperation({
    summary: "Get guild document history snapshot",
    description: "Retrieve a read-only snapshot for a document history entry",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "docId", description: "Document ID" })
  @ApiParam({ name: "historyId", description: "History entry ID" })
  @ZodResponse({
    status: 200,
    description: "Document history snapshot",
    type: GuildDocumentHistorySnapshotResponseDto,
  })
  getHistorySnapshot(
    @GuildData() guild: Guild,
    @Param("docId") documentId: string,
    @Param("historyId") historyId: string,
  ) {
    return this.docsService.getHistorySnapshot(guild.id, documentId, historyId);
  }

  @Permissions(...DOCS_READ_PERMISSIONS)
  @UseGuards(PermissionsGuard)
  @Get(":docId")
  @ApiOperation({
    summary: "Get guild document",
    description: "Retrieve a guild document with its current Lexical state",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "docId", description: "Document ID" })
  @ZodResponse({
    status: 200,
    description: "Guild document",
    type: GuildDocumentResponseDto,
  })
  getDocument(@GuildData() guild: Guild, @Param("docId") documentId: string) {
    return this.docsService.getDocument(guild.id, documentId);
  }

  @Permissions(Permission.LOOTLOG_DOCS_WRITE)
  @UseGuards(PermissionsGuard)
  @Put(":docId")
  @ApiOperation({
    summary: "Update guild document",
    description: "Save document title and Lexical state",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "docId", description: "Document ID" })
  @ZodResponse({
    status: 200,
    description: "Document updated successfully",
    type: GuildDocumentResponseDto,
  })
  updateDocument(
    @GuildData() guild: Guild,
    @Param("docId") documentId: string,
    @GuildMember() member: Member,
    @Body() data: UpdateGuildDocumentDto,
  ) {
    return this.docsService.updateDocument(
      guild.id,
      documentId,
      member.userId,
      data,
    );
  }

  @Permissions(Permission.LOOTLOG_DOCS_WRITE)
  @UseGuards(PermissionsGuard)
  @Delete(":docId")
  @ApiOperation({
    summary: "Move guild document to trash",
    description: "Soft-delete a guild document",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "docId", description: "Document ID" })
  @ZodResponse({
    status: 200,
    description: "Document moved to trash",
    type: DocsMutationResponseDto,
  })
  deleteDocument(
    @GuildData() guild: Guild,
    @GuildMember() member: Member,
    @Param("docId") documentId: string,
  ) {
    return this.docsService.moveDocumentToTrash(
      guild.id,
      documentId,
      member.userId,
    );
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Post(":docId/restore")
  @HttpCode(200)
  @ApiOperation({
    summary: "Restore guild document",
    description: "Restore a guild document from trash",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "docId", description: "Document ID" })
  @ZodResponse({
    status: 200,
    description: "Document restored",
    type: DocsMutationResponseDto,
  })
  restoreDocument(
    @GuildData() guild: Guild,
    @GuildMember() member: Member,
    @Param("docId") documentId: string,
  ) {
    return this.docsService.restoreDocument(
      guild.id,
      documentId,
      member.userId,
    );
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Delete(":docId/purge")
  @ApiOperation({
    summary: "Permanently delete guild document",
    description: "Permanently delete a guild document from trash",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "docId", description: "Document ID" })
  @ZodResponse({
    status: 200,
    description: "Document permanently deleted",
    type: DocsMutationResponseDto,
  })
  purgeDocument(@GuildData() guild: Guild, @Param("docId") documentId: string) {
    return this.docsService.purgeDocument(guild.id, documentId);
  }
}
