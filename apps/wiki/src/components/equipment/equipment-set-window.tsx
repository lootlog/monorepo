import { useSetSummary } from "@/hooks/use-set-summary";
import { EquipmentSetCharacter } from "./equipment-set-character";
import { EquipmentSetDoll } from "./equipment-set-doll";
import { EquipmentSetTotals } from "./equipment-set-totals";

/** The set as a game window: the character and slots beside every stat. */
export function EquipmentSetWindow() {
  const { preview, totals, previewTotals } = useSetSummary();

  return (
    <div className="grid items-start gap-6 md:grid-cols-[17rem_minmax(0,1fr)] md:gap-8">
      <div className="flex flex-col gap-3">
        <EquipmentSetCharacter />
        <EquipmentSetDoll size="xl" />
      </div>
      <div className="@container">
        <EquipmentSetTotals
          totals={totals}
          previewTotals={previewTotals}
          previewName={previewTotals ? (preview?.name ?? null) : null}
          layout="columns"
        />
      </div>
    </div>
  );
}
