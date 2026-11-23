import { Map as MapIcon, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import type { EventHeroNpc } from "@/lib/api/event-types";

type EventHeroActionsMenuProps = {
  hero: EventHeroNpc;
  onEditHero: (hero: EventHeroNpc) => void;
  onManageMaps: (hero: EventHeroNpc) => void;
  onRequestDeleteHero: (hero: EventHeroNpc) => void;
};

export const EventHeroActionsMenu = ({
  hero,
  onEditHero,
  onManageMaps,
  onRequestDeleteHero,
}: EventHeroActionsMenuProps) => {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground"
            aria-label={t("events.heroes.actions")}
            title={t("events.heroes.actions")}
          >
            <MoreVertical className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEditHero(hero)}>
          <Pencil className="size-4" />
          {t("events.heroes.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onManageMaps(hero)}>
          <MapIcon className="size-4" />
          {t("events.heroes.manageMaps")}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onRequestDeleteHero(hero)}
        >
          <Trash2 className="size-4" />
          {t("events.heroes.deleteAction")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
