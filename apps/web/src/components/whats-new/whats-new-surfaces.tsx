import type { ChangelogSurface } from "@lootlog/changelog/changelog";
import {
  AppWindow,
  Blocks,
  BookOpen,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export const WHATS_NEW_SURFACE_ICONS = {
  "game-client": Blocks,
  web: AppWindow,
  wiki: BookOpen,
  discord: MessageCircle,
} satisfies Record<ChangelogSurface, LucideIcon>;

/** Where the player meets a change. */
export const WhatsNewSurfaces = ({
  surfaces,
}: {
  surfaces: readonly ChangelogSurface[];
}) => {
  const { t } = useTranslation();

  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {surfaces.map((surface) => {
        const Icon = WHATS_NEW_SURFACE_ICONS[surface];

        return (
          <li key={surface} className="flex items-center gap-1.5">
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            {t(`layout.whatsNew.surfaces.${surface}`)}
          </li>
        );
      })}
    </ul>
  );
};
