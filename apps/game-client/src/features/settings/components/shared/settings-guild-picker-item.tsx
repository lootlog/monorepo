import { GuildAvatar } from "@/components/guild-avatar";
import { SettingsPickerCard } from "@/features/settings/components/shared/settings-picker-card";
import type { GuildIdentity as Guild } from "@/lib/api/generated-helpers";
import { Check } from "lucide-react";
import type { FC } from "react";

type SettingsGuildPickerItemProps = {
  guild: Guild;
  className?: string;
};

export const SettingsGuildPickerItem: FC<SettingsGuildPickerItemProps> = ({
  guild,
  className,
}) => (
  <SettingsPickerCard
    value={guild.id}
    label={guild.name}
    className={className}
    leading=<GuildAvatar guild={guild} size="lg" />
    title={guild.name}
    trailing={
      <span
        aria-hidden
        className="ll:flex ll:size-4 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-full ll:bg-primary ll:text-primary-foreground ll:scale-50 ll:opacity-0 ll:transition-[opacity,transform] ll:duration-medium ll:ease-enter ll:group-data-pressed/picker-card:scale-100 ll:group-data-pressed/picker-card:opacity-100"
      >
        <Check className="ll:size-3" />
      </span>
    }
  />
);
