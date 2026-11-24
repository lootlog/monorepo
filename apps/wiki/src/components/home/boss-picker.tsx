import { npcIconUrl } from "@lootlog/domain/npc-icon";
import { cn } from "cn";
import { NpcKindLevel } from "@/components/npcs/npc-kind-level";
import type { NewBoss } from "@/hooks/use-new-bosses";
import { t } from "@/i18n/messages";

type BossPickerProps = {
  bosses: readonly NewBoss[];
  pickedKey: string;
  isRotating: boolean;
  onPick: (key: string) => void;
};

export function BossPicker({
  bosses,
  pickedKey,
  isRotating,
  onPick,
}: BossPickerProps) {
  return (
    <ul
      aria-label={t("home.bossPickerLabel")}
      className="flex max-w-full gap-1 overflow-x-auto [scrollbar-width:none]"
    >
      {bosses.map((boss) => {
        const isPicked = boss.key === pickedKey;

        return (
          <li key={boss.key} className="shrink-0">
            <button
              type="button"
              aria-pressed={isPicked}
              onClick={() => onPick(boss.key)}
              className={cn(
                "relative flex w-24 flex-col items-center gap-1.5 overflow-hidden rounded-lg px-1.5 pt-2 pb-2.5 outline-none transition-[background-color,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                isPicked
                  ? "bg-foreground/10"
                  : "opacity-60 hover:bg-foreground/5 hover:opacity-100",
              )}
            >
              <span className="grid size-10 place-items-end justify-center overflow-hidden">
                {boss.icon ? (
                  <img
                    src={npcIconUrl(boss.icon)}
                    alt=""
                    className="max-h-10 max-w-10 [image-rendering:pixelated]"
                  />
                ) : null}
              </span>
              <span className="w-full truncate text-xs font-medium text-foreground">
                {boss.name}
              </span>
              <span className="w-full truncate text-[0.6875rem] text-muted-foreground">
                <NpcKindLevel npc={boss} />
              </span>
              {isPicked && isRotating ? (
                <span
                  key={boss.key}
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-1 h-0.5 origin-left rounded-full bg-primary animate-rotation-progress"
                />
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
