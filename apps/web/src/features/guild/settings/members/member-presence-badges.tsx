import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { BadgeCheck, Gamepad2, Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MemberOnlineSource } from "./member-list-item.utils";

type MemberPresenceBadgesProps = {
  onlineSources: MemberOnlineSource[];
  isGamePresenceVerified: boolean;
};

export function MemberPresenceBadges({
  onlineSources,
  isGamePresenceVerified,
}: MemberPresenceBadgesProps) {
  const { t } = useTranslation();

  return (
    <>
      {onlineSources.map((source) => {
        const Icon = source === "web" ? Globe2 : Gamepad2;

        const labelKey =
          source === "web"
            ? "settings.members.webActivity.onlineSources.web"
            : "settings.members.webActivity.onlineSources.game";

        return (
          <TooltipProvider key={source} delay={100}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    className="inline-flex size-5 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Icon className="size-3.5" />
                  </span>
                }
              />
              <TooltipContent side="top">
                <p className="text-sm font-semibold">{t(labelKey)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      {isGamePresenceVerified && (
        <TooltipProvider delay={100}>
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  className="inline-flex size-5 items-center justify-center rounded-md bg-sky-500/10 text-sky-500"
                  onClick={(event) => event.stopPropagation()}
                >
                  <BadgeCheck className="size-3.5" />
                </span>
              }
            />
            <TooltipContent side="top">
              <p className="text-sm font-semibold">
                {t(
                  "settings.members.webActivity.onlineSources.margonemVerified",
                )}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </>
  );
}
