import { Injectable, NotFoundException } from "@nestjs/common";
import { MapTemplateMapsResponseSchema } from "#src/shared/dto/map-template-response.dto";
import type { CreateMapTemplateDto } from "./dto/create-map-template.dto.js";
import { MapTemplatesRepository } from "./map-templates.repository.js";

@Injectable()
export class MapTemplatesService {
  constructor(private readonly repository: MapTemplatesRepository) {}

  async getTemplates(guildId: string) {
    const templates = await this.repository.findMany(guildId);

    return templates.map((template) => this.mapTemplateResponse(template));
  }

  async createTemplate(guildId: string, data: CreateMapTemplateDto) {
    const template = await this.repository.create(
      guildId,
      data.name,
      data.maps,
    );

    return this.mapTemplateResponse(template);
  }

  async updateTemplate(
    guildId: string,
    templateId: string,
    data: CreateMapTemplateDto,
  ) {
    const templateToUpdate = await this.repository.update(
      guildId,
      templateId,
      data.name,
      data.maps,
    );
    if (!templateToUpdate) throw new NotFoundException("Template not found");

    return this.mapTemplateResponse(templateToUpdate);
  }

  async deleteTemplate(guildId: string, templateId: string) {
    const deleted = await this.repository.delete(guildId, templateId);
    if (!deleted) throw new NotFoundException("Template not found");

    return { status: "OK" as const };
  }

  private mapTemplateResponse(template: {
    id: string;
    guildId: string;
    name: string;
    maps: unknown;
    createdAt: Date;
  }) {
    return {
      ...template,
      maps: MapTemplateMapsResponseSchema.parse(template.maps),
    };
  }
}
