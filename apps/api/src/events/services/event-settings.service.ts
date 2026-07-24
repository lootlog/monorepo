import { Injectable } from "@nestjs/common";
import { SettingsDocumentsService } from "src/settings-documents/settings-documents.service";
import type { UpdateEventSettingsDto } from "../dto/update-event-settings.dto";

const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

@Injectable()
export class EventSettingsService {
  constructor(
    private readonly settingsDocumentsService: SettingsDocumentsService,
  ) {}

  async getSettings(userId: string, guildId: string) {
    const response = await this.settingsDocumentsService.getPreferences(
      userId,
      {
        domains: ["events"],
        guildId,
      },
    );

    return this.toCompatibilitySettings(userId, guildId, response);
  }

  async updateSettings(
    userId: string,
    guildId: string,
    dto: UpdateEventSettingsDto,
  ) {
    const response = await this.settingsDocumentsService.patchPreferences(
      userId,
      {
        operations: [
          {
            domain: "events",
            scope: { type: "GUILD", id: guildId },
            set: { ...dto },
            unset: [],
          },
        ],
      },
    );

    return this.toCompatibilitySettings(userId, guildId, response);
  }

  private toCompatibilitySettings(
    userId: string,
    guildId: string,
    response: Awaited<ReturnType<SettingsDocumentsService["getPreferences"]>>,
  ) {
    const events = response.domains.events;
    const updatedAt = events?.updatedAt
      ? new Date(events.updatedAt)
      : new Date();

    return {
      userId,
      guildId,
      pinnedEvents: asStringArray(events?.effective.pinnedEvents),
      createdAt: updatedAt,
      updatedAt,
    };
  }
}
