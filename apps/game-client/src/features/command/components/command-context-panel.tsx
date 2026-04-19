import { useGuilds } from "@/hooks/api/use-guilds";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { CommandState } from "../command-state";

type CommandContextPanelProps = {
  commandState: CommandState;
  selectedGuildIds: string[];
};

const MODE_CLASS_NAMES = {
  normal: "ll:border-gray-500/70 ll:bg-gray-500/12 ll:text-gray-100",
  notification: "ll:border-amber-400/70 ll:bg-amber-400/12 ll:text-amber-100",
  party: "ll:border-emerald-400/70 ll:bg-emerald-400/12 ll:text-emerald-100",
} as const;

export const CommandContextPanel = ({
  commandState,
  selectedGuildIds,
}: CommandContextPanelProps) => {
  const { t } = useTranslation();
  const { data: guilds } = useGuilds();

  const selectedGuildNames =
    guilds
      ?.filter((guild) => selectedGuildIds.includes(guild.id))
      .map((guild) => guild.name) ?? [];

  const visibleGuildNames = selectedGuildNames.slice(0, 2).join(", ");
  const hiddenGuildCount = Math.max(selectedGuildNames.length - 2, 0);
  const recipientsLabel = commandState.hasRecipients
    ? t("settings.command.recipients.selectedCount", {
        count: selectedGuildIds.length,
      })
    : t("settings.command.recipients.noneSelected");
  const recipientsDetails =
    selectedGuildNames.length > 0
      ? hiddenGuildCount > 0
        ? t("settings.command.recipients.selectedNamesOverflow", {
            names: visibleGuildNames,
            count: hiddenGuildCount,
          })
        : visibleGuildNames
      : t("settings.command.recipients.missingHint");
  const modeLabel = t(`settings.command.modes.${commandState.mode}.label`);
  const modeDescription = t(
    `settings.command.modes.${commandState.mode}.description`,
  );

  return (
    <div className="ll:flex ll:flex-col ll:gap-1.5 ll:rounded-sm ll:border ll:border-gray-700/80 ll:bg-gray-950/75 ll:px-2 ll:py-2">
      <div className="ll:flex ll:items-center ll:justify-between ll:gap-2">
        <span
          className={cn(
            "ll:inline-flex ll:min-h-5 ll:items-center ll:rounded-sm ll:border ll:px-1.5 ll:py-0.5 ll:text-[9px] ll:font-semibold ll:text-white",
            commandState.hasRecipients
              ? "ll:border-sky-400/70 ll:bg-sky-400/12"
              : "ll:border-red-400/70 ll:bg-red-500/12 ll:text-red-100",
          )}
        >
          {recipientsLabel}
        </span>
        <span
          className={cn(
            "ll:inline-flex ll:min-h-5 ll:items-center ll:rounded-sm ll:border ll:px-1.5 ll:py-0.5 ll:text-[9px] ll:font-semibold",
            MODE_CLASS_NAMES[commandState.mode],
          )}
        >
          {modeLabel}
        </span>
      </div>

      <div className="ll:flex ll:flex-col ll:gap-0.5 ll:text-[11px] ll:leading-4">
        <span className="ll:text-gray-200">{modeDescription}</span>
        <span
          className={cn(
            "ll:truncate",
            commandState.hasRecipients ? "ll:text-gray-400" : "ll:text-red-200",
          )}
          title={recipientsDetails}
        >
          {t("settings.command.recipients.prefix", {
            recipients: recipientsDetails,
          })}
        </span>
      </div>
    </div>
  );
};
