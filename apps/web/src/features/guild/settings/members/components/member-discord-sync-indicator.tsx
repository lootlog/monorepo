import type { MemberResponseDto as GuildMember } from "@lootlog/api-client/models/main/member-response-dto";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { type FC } from "react";
import { useTranslation } from "react-i18next";
import {
  getMemberDiscordSyncPresentation,
  type MemberDiscordSyncTone,
} from "../member-discord-sync.utils";

export type MemberDiscordSyncIndicatorProps = {
  member: GuildMember;
};

const indicatorToneClassNames: Record<MemberDiscordSyncTone, string> = {
  success: "bg-emerald-500/10 text-emerald-500",
  warning: "bg-amber-500/10 text-amber-500",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

const iconByTone = {
  success: Info,
  warning: AlertTriangle,
  danger: AlertCircle,
  neutral: Info,
} satisfies Record<MemberDiscordSyncTone, typeof Info>;

export const MemberDiscordSyncIndicator: FC<
  MemberDiscordSyncIndicatorProps
> = ({ member }) => {
  const { t } = useTranslation();
  const presentation = getMemberDiscordSyncPresentation(member);

  if (!presentation.showListIndicator) {
    return null;
  }

  const Icon = iconByTone[presentation.tone];

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "p-1.5 rounded-md transition-colors",
              indicatorToneClassNames[presentation.tone],
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <Icon className="size-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              {t(
                `settings.members.discordSync.status.${presentation.copyKey}.title`,
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(
                `settings.members.discordSync.status.${presentation.copyKey}.description`,
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t("settings.members.discordSync.fields.technicalStatus")}:{" "}
              {member.lastDiscordStatus ??
                t("settings.members.discordSync.values.notAvailable")}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
