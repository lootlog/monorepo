import { cn } from "cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import type { UserLootStatsResponseDtoOutputLegendsItem } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";

const VISIBLE_CHARACTERS = 2;

const showNames = (names: string) => names;

type StatisticsLegendCharactersProps = {
  characters: UserLootStatsResponseDtoOutputLegendsItem["caughtBy"];
  label?: (names: string) => string;
  className?: string;
};

export function StatisticsLegendCharacters({
  characters,
  label = showNames,
  className,
}: StatisticsLegendCharactersProps) {
  const { t } = useTranslation();

  const names = characters.map((character) =>
    character.caught > 1
      ? t("statistics.legend.caughtByCharacter", {
          name: character.name,
          count: character.caught,
        })
      : character.name,
  );

  const visible = names.slice(0, VISIBLE_CHARACTERS);
  const hidden = names.slice(VISIBLE_CHARACTERS);

  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <span className="truncate">{label(visible.join(", "))}</span>
      {hidden.length > 0 && (
        <Popover>
          <PopoverTrigger
            openOnHover
            render={
              <button
                type="button"
                aria-label={t("statistics.legend.moreCharacters", {
                  characters: hidden.join(", "),
                })}
                className="shrink-0 cursor-pointer rounded-sm font-medium text-muted-foreground tabular-nums outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            }
          >
            {t("statistics.legend.moreCount", { count: hidden.length })}
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-64 px-3 py-2 text-sm">
            <ul>
              {hidden.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </span>
  );
}
