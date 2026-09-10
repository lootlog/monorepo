import { Button } from "@lootlog/ui/components/button";
import { Label } from "@lootlog/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { FileText, Plus, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { MapTemplateResponseDto } from "@lootlog/client/main";
import type { LocationData } from "./map-manage-dialog.types";

interface EventMapTemplatesProps {
  guildId: string;
  templates: MapTemplateResponseDto[] | undefined;
  heroLocations: LocationData[];
  isAdding: boolean;
  pendingTemplate: { templateId: string; locationId: string | null } | null;
  handleLoadTemplate: (
    template: MapTemplateResponseDto,
    locationId: string | null,
  ) => void;
}

export function EventMapTemplates({
  guildId,
  templates,
  heroLocations,
  isAdding,
  pendingTemplate,
  handleLoadTemplate,
}: EventMapTemplatesProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("events.maps.loadFromTemplate")}
        </Label>
        {templates && templates.length > 0 && (
          <TextLink
            target="_blank"
            className="inline-flex items-center gap-1 text-xs"
            render=<Link
              to="/$guildId/settings/map-templates"
              params={{ guildId }}
            />
          >
            <Settings className="size-3" />
            {t("events.maps.manageTemplates")}
          </TextLink>
        )}
      </div>
      {templates && templates.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {templates.map((template) => (
            <Popover key={template.id}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    disabled={isAdding}
                  >
                    <FileText className="size-3" />
                    {template.name}
                    <span className="text-muted-foreground">
                      ({template.maps.length})
                    </span>
                    <Plus className="size-3 ml-0.5" />
                  </Button>
                }
              />
              <PopoverContent className="w-48 p-2" align="start">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {t("events.locations.addTo")}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7 text-xs"
                    loading={
                      pendingTemplate?.templateId === template.id &&
                      pendingTemplate.locationId === null
                    }
                    onClick={() => handleLoadTemplate(template, null)}
                    disabled={isAdding}
                  >
                    {t("events.locations.noLocation")}
                  </Button>
                  {heroLocations.map((loc) => (
                    <Button
                      key={loc.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-7 text-xs"
                      loading={
                        pendingTemplate?.templateId === template.id &&
                        pendingTemplate.locationId === loc.id
                      }
                      onClick={() => handleLoadTemplate(template, loc.id)}
                      disabled={isAdding}
                    >
                      {loc.name}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </div>
      ) : (
        <div className="px-3 py-3 text-center">
          <p className="text-xs text-muted-foreground mb-2">
            {t("events.maps.noTemplatesHint")}
          </p>
          <TextLink
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs"
            render=<Link
              to="/$guildId/settings/map-templates"
              params={{ guildId }}
            />
          >
            <Plus className="size-3" />
            {t("events.maps.createTemplates")}
          </TextLink>
        </div>
      )}
    </div>
  );
}
