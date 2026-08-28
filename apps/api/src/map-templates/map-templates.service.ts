import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "src/db/domain";
import { PrismaService } from "src/db/prisma.service";
import { MapTemplateMapsResponseSchema } from "src/shared/dto/map-template-response.dto";
import type { CreateMapTemplateDto } from "./dto/create-map-template.dto";

@Injectable()
export class MapTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplates(guildId: string) {
    const templates = await this.prisma.orm.public.MapTemplate.findMany({
      where: { guildId },
      orderBy: { name: "asc" },
    });

    return templates.map((template) => this.mapTemplateResponse(template));
  }

  async createTemplate(guildId: string, data: CreateMapTemplateDto) {
    const template = await this.prisma.orm.public.MapTemplate.create({
      data: {
        guildId,
        name: data.name,
        maps: data.maps as unknown as Prisma.InputJsonValue,
      },
    });

    return this.mapTemplateResponse(template);
  }

  async updateTemplate(
    guildId: string,
    templateId: string,
    data: CreateMapTemplateDto,
  ) {
    const template = await this.prisma.orm.public.MapTemplate.findFirst({
      where: { id: templateId, guildId },
    });

    if (!template) {
      throw new NotFoundException("Template not found");
    }

    const templateToUpdate = await this.prisma.orm.public.MapTemplate.update({
      where: { id: templateId },
      data: {
        name: data.name,
        maps: data.maps as unknown as Prisma.InputJsonValue,
      },
    });

    return this.mapTemplateResponse(templateToUpdate);
  }

  async deleteTemplate(guildId: string, templateId: string) {
    const template = await this.prisma.orm.public.MapTemplate.findFirst({
      where: { id: templateId, guildId },
    });

    if (!template) {
      throw new NotFoundException("Template not found");
    }

    await this.prisma.orm.public.MapTemplate.delete({
      where: { id: templateId },
    });

    return { status: "OK" as const };
  }

  private mapTemplateResponse(template: {
    id: string;
    guildId: string;
    name: string;
    maps: Prisma.JsonValue;
    createdAt: Date;
  }) {
    return {
      ...template,
      maps: MapTemplateMapsResponseSchema.parse(template.maps),
    };
  }
}
