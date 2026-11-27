import {
  BINGO_TILE_PRESETS,
  type BingoTilePreset,
} from "@lootlog/domain/bingo";
import type {
  BingoBoardDetailResponseDtoTilesItemCondition,
  ReplaceBingoTilesDtoTilesItem,
} from "@lootlog/client/main";
import { ItemRarityEnum } from "@lootlog/schema/item-rarity";
import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Textarea } from "@lootlog/ui/components/textarea";
import { SlidersHorizontal, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { BingoConditionFields } from "./bingo-condition-fields";

type ConditionKind = BingoBoardDetailResponseDtoTilesItemCondition["kind"];

const CONDITION_KINDS: readonly ConditionKind[] = [
  "LOOT",
  "KILL",
  "HERO_SIGHTING",
  "BATTLE",
  "MANUAL",
];

const defaultConditionForKind = (
  kind: ConditionKind,
  targetCount: number,
): BingoBoardDetailResponseDtoTilesItemCondition => {
  switch (kind) {
    case "LOOT":
      return {
        kind: "LOOT",
        targetCount,
        rarities: [ItemRarityEnum.LEGENDARY],
        npcTypes: [NpcTypeEnum.ELITE2],
      };
    case "KILL":
      return {
        kind: "KILL",
        targetCount,
        npcTypes: [NpcTypeEnum.COLOSSUS],
      };
    case "HERO_SIGHTING":
      return {
        kind: "HERO_SIGHTING",
        targetCount,
        includeManual: false,
      };
    case "BATTLE":
      return {
        kind: "BATTLE",
        targetCount,
        metric: "WIN_STREAK",
        matchmakingOnly: true,
        battleTypes: [],
        excludeFlee: true,
      };
    case "MANUAL":
      return {
        kind: "MANUAL",
        targetCount,
      };
  }
};

type BingoTileEditorDialogProps = {
  readonly open: boolean;
  readonly row: number;
  readonly col: number;
  readonly initialTile: ReplaceBingoTilesDtoTilesItem | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (tile: ReplaceBingoTilesDtoTilesItem) => void;
  readonly onClear: () => void;
};

export const BingoTileEditorDialog = ({
  open,
  row,
  col,
  initialTile,
  onOpenChange,
  onSave,
  onClear,
}: BingoTileEditorDialogProps) => {
  const { t } = useTranslation();

  const [title, setTitle] = useState(initialTile?.title ?? "");

  const [description, setDescription] = useState(
    initialTile?.description ?? "",
  );

  const [pointsText, setPointsText] = useState(
    initialTile?.points !== null && initialTile?.points !== undefined
      ? String(initialTile.points)
      : "",
  );

  const [condition, setCondition] =
    useState<BingoBoardDetailResponseDtoTilesItemCondition>(
      initialTile?.condition ?? defaultConditionForKind("LOOT", 1),
    );

  const applyPreset = (preset: BingoTilePreset) => {
    setTitle(preset.title);
    setDescription(preset.description);
    setCondition(structuredClone(preset.condition));
  };

  const handleKindChange = (nextKind: ConditionKind) => {
    if (nextKind === condition.kind) return;

    setCondition(defaultConditionForKind(nextKind, condition.targetCount));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) return;

    const parsedPoints = pointsText.trim()
      ? Math.max(0, Math.trunc(Number(pointsText)))
      : null;

    onSave({
      row,
      col,
      title: trimmedTitle,
      description: description.trim() || null,
      points:
        parsedPoints !== null && Number.isFinite(parsedPoints)
          ? parsedPoints
          : null,
      condition,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <IconDialogHeader
          icon={SlidersHorizontal}
          title={t("bingo.tileEditor.title", { row: row + 1, col: col + 1 })}
        />

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="space-y-4 overflow-y-auto p-5">
            <div className="space-y-2">
              <Label>{t("bingo.tileEditor.presets")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {BINGO_TILE_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.title}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("bingo.tileEditor.tileTitle")}</Label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("bingo.tileEditor.tileTitlePlaceholder")}
                  maxLength={80}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("bingo.tileEditor.customPoints")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  value={pointsText}
                  onChange={(event) => setPointsText(event.target.value)}
                  placeholder={t("bingo.tileEditor.customPointsPlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("bingo.tileEditor.tileDescription")}</Label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("bingo.tileEditor.tileDescriptionPlaceholder")}
                maxLength={240}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("bingo.tileEditor.conditionKind")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {CONDITION_KINDS.map((kind) => (
                  <Button
                    key={kind}
                    type="button"
                    size="sm"
                    variant={condition.kind === kind ? "default" : "outline"}
                    onClick={() => handleKindChange(kind)}
                  >
                    {t(`bingo.conditionKind.${kind}`)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("bingo.tileEditor.targetCount")}</Label>
              <Input
                type="number"
                min={1}
                max={100000}
                value={condition.targetCount}
                onChange={(event) =>
                  setCondition({
                    ...condition,
                    targetCount: Math.max(1, Number(event.target.value) || 1),
                  })
                }
              />
            </div>

            <BingoConditionFields
              condition={condition}
              onChange={setCondition}
            />
          </div>

          <DialogFooter className="flex items-center justify-between border-t border-border/60 px-5 py-3">
            <div>
              {initialTile ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  icon={<Trash2 className="size-4" />}
                  onClick={() => {
                    onClear();
                    onOpenChange(false);
                  }}
                >
                  {t("bingo.actions.clearTile")}
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("bingo.actions.cancel")}
              </Button>
              <Button type="submit" disabled={!title.trim()}>
                {t("bingo.actions.applyTile")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
