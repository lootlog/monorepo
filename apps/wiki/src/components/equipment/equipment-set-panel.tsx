import { Trash2 } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { ShareLinkButton } from "@/components/common/share-link-button";
import { useEquipmentPreview } from "@/contexts/equipment-preview-context";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useWornItems } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import {
  encodeEquipmentSet,
  EQUIPMENT_SET_PARAM,
  type Profession,
} from "@/lib/equipment-set";
import { EQUIPMENT_SLOTS, findEquipmentSlot } from "@/lib/equipment-slots";
import { PROFESSION_OPTIONS } from "@/lib/item-options";
import { sumItemStats } from "@/lib/item-stat-totals";
import { CharacterLevelInput } from "./character-level-input";
import { EquipmentGrid } from "./equipment-grid";
import { EquipmentSetSlot } from "./equipment-set-slot";
import { EquipmentSetTotals } from "./equipment-set-totals";

const ANY_PROFESSION = "any";

const professionOptions = [
  { value: ANY_PROFESSION, label: t("equipment.anyProfession") },
  ...PROFESSION_OPTIONS.map((value) => ({
    value,
    label: t(`filters.professions.${value}`),
  })),
];

const isProfession = (value: string): value is Profession =>
  PROFESSION_OPTIONS.some((profession) => profession === value);

/** The User's set: who wears it, each slot, the stats and a link to share. */
export function EquipmentSetPanel() {
  const { set, setCharacter, clear } = useEquipmentSet();
  const preview = useEquipmentPreview();

  const wornItems = useWornItems();

  const previewSlot = preview ? findEquipmentSlot(preview.type) : undefined;

  const totals = sumItemStats(
    [...wornItems.values()].map(({ item }) => item.stat),
  );

  const previewTotals =
    preview && previewSlot
      ? sumItemStats([
          ...[...wornItems].flatMap(([slotId, { item }]) =>
            slotId === previewSlot.id ? [] : [item.stat],
          ),
          preview.stat,
        ])
      : null;

  return (
    <section aria-labelledby="equipment-set" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2
          id="equipment-set"
          className="flex flex-1 items-baseline gap-2 text-sm font-semibold text-foreground"
        >
          {t("equipment.title")}
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {t("equipment.wornCount", {
              worn: wornItems.size,
              total: EQUIPMENT_SLOTS.length,
            })}
          </span>
        </h2>
        <ShareLinkButton
          path="/"
          param={EQUIPMENT_SET_PARAM}
          value={encodeEquipmentSet(set)}
          compact
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("equipment.clear")}
          title={t("equipment.clear")}
          disabled={wornItems.size === 0}
          onClick={clear}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_4rem] gap-2">
        <Select
          value={set.profession ?? ANY_PROFESSION}
          onValueChange={(value) =>
            setCharacter({
              profession: value && isProfession(value) ? value : null,
              level: set.level,
            })
          }
          items={professionOptions}
        >
          <SelectTrigger
            size="sm"
            className="w-full"
            aria-label={t("equipment.profession")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {professionOptions.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CharacterLevelInput size="sm" aria-label={t("equipment.level")} />
      </div>

      <div className="relative isolate flex justify-center overflow-hidden rounded-xl border border-border/50 bg-background/50 py-4">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(65%_55%_at_50%_45%,color-mix(in_oklab,var(--primary)_9%,transparent),transparent_75%)]"
        />
        <EquipmentGrid
          renderSlot={(slot) => (
            <EquipmentSetSlot
              slot={slot}
              worn={wornItems.get(slot.id)}
              preview={previewSlot?.id === slot.id ? preview : null}
            />
          )}
        />
      </div>

      <div>
        <EquipmentSetTotals
          totals={totals}
          previewTotals={previewTotals}
          previewName={previewTotals ? (preview?.name ?? null) : null}
        />
      </div>
    </section>
  );
}
