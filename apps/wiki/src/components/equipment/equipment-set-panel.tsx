import { useState } from "react";
import { Check, Link2, Trash2 } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { useEquipmentPreview } from "@/contexts/equipment-preview-context";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useWornItems } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import {
  encodeEquipmentSet,
  EQUIPMENT_SET_PARAM,
  type Profession,
} from "@/lib/equipment-set";
import { findEquipmentSlot } from "@/lib/equipment-slots";
import { PROFESSION_OPTIONS } from "@/lib/item-options";
import { sumItemStats } from "@/lib/item-stat-totals";
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

  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

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

  const share = async () => {
    const url = new URL(window.location.origin);

    url.searchParams.set(EQUIPMENT_SET_PARAM, encodeEquipmentSet(set));

    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    setTimeout(() => setCopyState("idle"), 2000);
  };

  return (
    <section aria-labelledby="equipment-set" className="flex flex-col gap-4">
      <h2 id="equipment-set" className="text-sm font-semibold text-foreground">
        {t("equipment.title")}
      </h2>

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
        <Input
          type="number"
          min={1}
          max={500}
          size="sm"
          aria-label={t("equipment.level")}
          placeholder={t("equipment.levelPlaceholder")}
          value={set.level ?? ""}
          onChange={(event) => {
            const level = Number.parseInt(event.target.value, 10);

            setCharacter({
              profession: set.profession,
              level:
                Number.isInteger(level) && level > 0 && level <= 500
                  ? level
                  : null,
            });
          }}
        />
      </div>

      <EquipmentGrid
        className="mx-auto"
        renderSlot={(slot) => (
          <EquipmentSetSlot
            slot={slot}
            worn={wornItems.get(slot.id)}
            preview={previewSlot?.id === slot.id ? preview : null}
          />
        )}
      />

      <div className="border-t border-border/50 pt-3">
        <EquipmentSetTotals
          totals={totals}
          previewTotals={previewTotals}
          previewName={previewTotals ? (preview?.name ?? null) : null}
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => void share()}
        >
          {copyState === "copied" ? (
            <Check aria-hidden="true" />
          ) : (
            <Link2 aria-hidden="true" />
          )}
          <span aria-live="polite">
            {copyState === "idle"
              ? t("equipment.share")
              : t(`equipment.${copyState}`)}
          </span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("equipment.clear")}
          title={t("equipment.clear")}
          onClick={clear}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
