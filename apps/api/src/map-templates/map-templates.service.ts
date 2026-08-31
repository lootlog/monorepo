import { and, not, or } from "@prisma/orm-family-sql/orm-client";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createId } from "@paralleldrive/cuid2";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";
import { PRISMA_DB, type PrismaDb } from "#src/db/prisma.provider";
import { temporalToDate } from "#src/db/temporal";
import {
  type MapTemplateResponse,
  MapTemplateMapsResponseSchema,
} from "#src/shared/dto/map-template-response.dto";
import type { CreateMapTemplateDto } from "./dto/create-map-template.dto.js";

@Injectable()
export class MapTemplatesService {
  constructor(@Inject(PRISMA_DB) private readonly prisma: PrismaDb) {}

  async getTemplates(guildId: string): Promise<MapTemplateResponse[]> {
    const templates = await this.prisma.orm.public.MapTemplate.where((row) =>
      row.guildId.eq(guildId),
    )
      .select("id", "guildId", "name", "maps", "createdAt")
      .orderBy((template) => template.name.asc())
      .all();

    return templates.map((template) => this.mapTemplateResponse(template));
  }

  async createTemplate(
    guildId: string,
    data: CreateMapTemplateDto,
  ): Promise<MapTemplateResponse> {
    const template = await this.prisma.orm.public.MapTemplate.create({
      id: createId(),
      guildId,
      name: data.name,
      maps: data.maps as JsonValue,
    });

    return this.mapTemplateResponse(template);
  }

  async updateTemplate(
    guildId: string,
    templateId: string,
    data: CreateMapTemplateDto,
  ): Promise<MapTemplateResponse> {
    const template = await this.prisma.orm.public.MapTemplate.where((row) =>
      and(row.id.eq(templateId), row.guildId.eq(guildId)),
    ).first();

    if (!template) {
      throw new NotFoundException("Template not found");
    }

    const templateToUpdate = await this.prisma.orm.public.MapTemplate.where(
      (row) => row.id.eq(templateId),
    ).update({ name: data.name, maps: data.maps as JsonValue });

    return this.mapTemplateResponse(templateToUpdate);
  }

  async deleteTemplate(guildId: string, templateId: string) {
    const template = await this.prisma.orm.public.MapTemplate.where((row) =>
      and(row.id.eq(templateId), row.guildId.eq(guildId)),
    ).first();

    if (!template) {
      throw new NotFoundException("Template not found");
    }

    await this.prisma.orm.public.MapTemplate.where((row) =>
      row.id.eq(templateId),
    ).delete();

    return { status: "OK" as const };
  }

  private mapTemplateResponse(template: {
    id: string;
    guildId: string;
    name: string;
    maps: unknown;
    createdAt: Date | { toString(): string };
  }): MapTemplateResponse {
    return {
      ...template,
      maps: MapTemplateMapsResponseSchema.parse(template.maps),
      createdAt: temporalToDate(template.createdAt),
    };
  }
}
