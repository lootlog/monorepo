import { npcIconUrl } from "@lootlog/domain/npc-icon";
import { cn } from "cn";
import { t } from "@/i18n/messages";

type BossPickerProps = {
  bosses: ReadonlyArray<{ key: string; name: string; icon: string | null }>;
  pickedKey: string;
  onPick: (key: string) => void;
};

export function BossPicker({ bosses, pickedKey, onPick }: BossPickerProps) {
  return (
    <ul
      aria-label={t("home.bossPickerLabel")}
      className="flex max-w-full gap-1 overflow-x-auto [scrollbar-width:none]"
    >
      {bosses.map(({ key, name, icon }) => (
        <li key={key} className="shrink-0">
          <button
            type="button"
            aria-pressed={key === pickedKey}
            aria-label={name}
            title={name}
            onClick={() => onPick(key)}
            className={cn(
              "grid size-12 place-items-center overflow-hidden rounded-lg outline-none transition-[background-color,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              key === pickedKey
                ? "bg-foreground/10"
                : "opacity-55 hover:bg-foreground/5 hover:opacity-100",
            )}
          >
            {icon ? (
              <img
                src={npcIconUrl(icon)}
                alt=""
                className="max-h-10 max-w-10 [image-rendering:pixelated]"
              />
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
