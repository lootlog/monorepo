import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { GuildSelect } from "@/components/guild-select";
import { GuildsLoadStatus } from "@/components/guilds-load-status";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";

type GuildTargetSelectProps = {
  /** Resolved target (see `useGuildTargets`), set once the Lootlogs load. */
  value: string | undefined;
  onValueChange: (guildId: string) => void;
  "aria-label"?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * "Send to" field for composers that post to one Lootlog: the Lootlog
 * select, its loading state, or why there is nothing to choose.
 */
export const GuildTargetSelect: FC<GuildTargetSelectProps> = ({
  value,
  onValueChange,
  "aria-label": ariaLabel,
  id,
  disabled,
  className,
}) => {
  const { t } = useTranslation("common");

  const {
    areVisibleGuildsResolved,
    guildsQuery: { data: guilds },
    visibleGuilds,
  } = useLootlogGuilds();

  if (!areVisibleGuildsResolved || !guilds) {
    return <GuildsLoadStatus className={className} />;
  }

  if (value === undefined) {
    return guilds.length > 0 ? (
      <span
        className={cn(
          "ll:px-1.5 ll:text-xs ll:text-muted-foreground",
          className,
        )}
      >
        {t("guildSwitcher.allHidden")}
      </span>
    ) : null;
  }

  return (
    <GuildSelect
      id={id}
      aria-label={ariaLabel}
      guilds={visibleGuilds}
      value={value}
      disabled={disabled}
      className={className}
      onValueChange={onValueChange}
    />
  );
};
