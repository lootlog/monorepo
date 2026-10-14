import { MetaItem } from "@/components/common/meta-item";
import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import type { MapTemplateResponseDto } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { cn } from "cn";
import { ChevronRight, MapPin, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type MapTemplateTileProps = {
  template: MapTemplateResponseDto;
  onEdit: () => void;
  onDelete: () => Promise<void>;
};

/** One map template; the tile unfolds its maps, and its actions edit or delete it. */
export const MapTemplateTile = ({
  template,
  onEdit,
  onDelete,
}: MapTemplateTileProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <li data-list-tile className={LIST_TILE_RULE_CLASS}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center transition-colors hover:bg-muted/30 motion-reduce:transition-none">
          <CollapsibleTrigger
            className={cn(getListTileLinkClassName(true), "text-left")}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <ChevronRight
                aria-hidden
                className={cn(
                  "size-4 text-muted-foreground transition-[rotate] duration-200 ease-emphasized motion-reduce:transition-none",
                  isExpanded && "rotate-90",
                )}
              />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-sm font-semibold">
                {template.name}
              </span>
              <MetaItem icon={MapPin}>
                {t("settings.mapTemplates.mapCount", {
                  count: template.maps.length,
                })}
              </MetaItem>
            </span>
          </CollapsibleTrigger>
          <div className={LIST_TILE_ACTIONS_CLASS}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={t("settings.mapTemplates.editTemplate", {
                name: template.name,
              })}
              onClick={onEdit}
            >
              <Pencil className="size-4" />
            </Button>
            <ConfirmDeleteDialog
              onConfirm={onDelete}
              title={t("settings.mapTemplates.deleteConfirmTitle")}
              description={t("settings.mapTemplates.deleteConfirmDescription", {
                name: template.name,
              })}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("settings.mapTemplates.deleteTemplate", {
                    name: template.name,
                  })}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              }
            />
          </div>
        </div>
        <CollapsibleContent>
          {/* The maps line up under the template's name. */}
          <ul
            className={cn(
              "flex flex-wrap gap-2 pb-3",
              LIST_TILE_INSET_CLASS,
              "pl-15 sm:pl-16",
            )}
          >
            {template.maps.map((map) => (
              <li
                key={map.id}
                className="inline-flex items-center gap-1.5 rounded bg-primary/10 px-2 py-1 text-xs text-primary"
              >
                <MapPin className="size-3" aria-hidden />
                {map.name}
                <span className="text-muted-foreground">({map.id})</span>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
};
