import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { Backpack, Swords } from "lucide-react";
import type { UserEquipmentSetResponseDto } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useFighterProfile } from "@/hooks/use-fighter-profile";
import { t } from "@/i18n/messages";
import {
  CHARACTER_STAT_SECTIONS,
  formatCharacterStatLine,
} from "@/lib/character-stat-lines";
import { decodeEquipmentSet, OPPONENT_SET_PARAM } from "@/lib/equipment-set";
import { savedSetSummary } from "@/lib/saved-set-summary";
import { EquipmentGrid } from "./equipment-grid";
import { SavedSetEditForm } from "./saved-set-edit-form";
import { SavedSetMenu } from "./saved-set-menu";
import { SavedSetSlot } from "./saved-set-slot";

const KEY_STATS = [
  "hp",
  "physical",
  "fire",
  "light",
  "frost",
  "attackSpeed",
  "critChance",
  "armor",
  "evadePoints",
];

const STAT_LINES = new Map(
  CHARACTER_STAT_SECTIONS.flatMap(({ lines }) =>
    lines.map((line) => [line.id, line] as const),
  ),
);

const KEY_STAT_LINES = KEY_STATS.flatMap((id) => STAT_LINES.get(id) ?? []);

type SavedCharacterCardProps = {
  saved: UserEquipmentSetResponseDto;
  onDeleted: () => void;
};

export function SavedCharacterCard({
  saved,
  onDeleted,
}: SavedCharacterCardProps) {
  const { replace } = useEquipmentSet();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const actionsRef = useRef<HTMLButtonElement>(null);
  const stored = decodeEquipmentSet(saved.code);
  const { profile, wornItems } = useFighterProfile(stored);
  const fightHref = `/fight?${new URLSearchParams({ [OPPONENT_SET_PARAM]: saved.code })}`;

  return (
    <Card className="gap-4 px-5" aria-label={saved.name} role="article">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{saved.name}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {savedSetSummary(stored)}
          </p>
        </div>
        <SavedSetMenu
          saved={saved}
          triggerRef={actionsRef}
          onEdit={() => setIsEditing(true)}
          onDeleted={onDeleted}
        />
      </div>
      {isEditing ? (
        <SavedSetEditForm
          saved={saved}
          onDone={() => {
            flushSync(() => setIsEditing(false));
            actionsRef.current?.focus();
          }}
        />
      ) : saved.description === "" ? (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="self-start text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("savedSets.addDescription")}
        </button>
      ) : (
        <p className="text-sm break-words whitespace-pre-line">
          {saved.description}
        </p>
      )}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <EquipmentGrid
          size="sm"
          className="shrink-0"
          renderSlot={(slot) => (
            <SavedSetSlot slot={slot} worn={wornItems.get(slot.id)} />
          )}
        />
        {profile ? (
          <dl className="grid min-w-44 flex-1 grid-cols-[auto_1fr] content-start gap-x-4 gap-y-1.5 text-sm">
            {KEY_STAT_LINES.flatMap((line) => {
              const stat = formatCharacterStatLine(profile.stats, line);

              return line.always || stat.value !== 0
                ? [
                    <div key={line.id} className="contents">
                      <dt className="text-muted-foreground">
                        {t(`character.stats.${line.id}`)}
                      </dt>
                      <dd className="text-right font-medium tabular-nums">
                        {stat.text}
                      </dd>
                    </div>,
                  ]
                : [];
            })}
          </dl>
        ) : (
          <p className="min-w-44 flex-1 text-sm text-muted-foreground">
            {t("savedSets.noProfession")}
          </p>
        )}
      </div>
      <div className="mt-auto flex flex-wrap gap-2 *:grow">
        <Button
          type="button"
          onClick={() => {
            replace(stored);
            void navigate({ to: "/set" });
          }}
        >
          <Backpack aria-hidden="true" />
          {t("savedSets.loadToSet")}
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href={fightHref} />}
        >
          <Swords aria-hidden="true" />
          {t("savedSets.fightAsOpponent")}
        </Button>
      </div>
    </Card>
  );
}
