import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "src/db/prisma.service";
import type { CreateMapTemplateDto } from "./dto/create-map-template.dto";

@Injectable()
export class MapTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplates(guildId: string) {
    return this.prisma.mapTemplate.findMany({
      where: { guildId },
      orderBy: { name: "asc" },
    });
  }

  async createTemplate(guildId: string, data: CreateMapTemplateDto) {
    return this.prisma.mapTemplate.create({
      data: {
        guildId,
        name: data.name,
        maps: data.maps as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async deleteTemplate(guildId: string, templateId: string) {
    const template = await this.prisma.mapTemplate.findFirst({
      where: { id: templateId, guildId },
    });

    if (!template) {
      throw new NotFoundException("Template not found");
    }

    await this.prisma.mapTemplate.delete({
      where: { id: templateId },
    });

    return { success: true };
  }
}
