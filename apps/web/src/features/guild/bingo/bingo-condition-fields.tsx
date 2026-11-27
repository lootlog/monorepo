import type { BingoBoardDetailResponseDtoTilesItemCondition } from "@lootlog/client/main";
import { ItemRarityEnum } from "@lootlog/schema/item-rarity";
import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Switch } from "@lootlog/ui/components/switch";
import { xor } from "es-toolkit";
import { useTranslation } from "react-i18next";

const RARITY_OPTIONS: readonly ItemRarityEnum[] = [
  ItemRarityEnum.UNIQUE,
  ItemRarityEnum.HEROIC,
  ItemRarityEnum.LEGENDARY,
  ItemRarityEnum.UPGRADED,
];

const NPC_TYPE_OPTIONS: readonly NpcTypeEnum[] = [
  NpcTypeEnum.ELITE,
  NpcTypeEnum.ELITE2,
  NpcTypeEnum.ELITE3,
  NpcTypeEnum.HERO,
  NpcTypeEnum.EVENT_HERO,
  NpcTypeEnum.COLOSSUS,
  NpcTypeEnum.TITAN,
];

const parseLevel = (raw: string): number | null => {
  const trimmed = raw.trim();

  if (!trimmed) return null;

  const value = Number(trimmed);

  return Number.isFinite(value)
    ? Math.max(1, Math.min(500, Math.trunc(value)))
    : null;
};

type BingoConditionFieldsProps = {
  readonly condition: BingoBoardDetailResponseDtoTilesItemCondition;
  readonly onChange: (
    next: BingoBoardDetailResponseDtoTilesItemCondition,
  ) => void;
};

export const BingoConditionFields = ({
  condition,
  onChange,
}: BingoConditionFieldsProps) => {
  const { t } = useTranslation();

  if (condition.kind === "MANUAL") return null;

  if (condition.kind === "LOOT") {
    const toggleRarity = (rarity: ItemRarityEnum) =>
      onChange({ ...condition, rarities: xor(condition.rarities, [rarity]) });

    const toggleNpcType = (npcType: NpcTypeEnum) =>
      onChange({ ...condition, npcTypes: xor(condition.npcTypes, [npcType]) });

    return (
      <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-3.5">
        <div className="space-y-2">
          <Label>{t("bingo.tileEditor.rarities")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {RARITY_OPTIONS.map((rarity) => (
              <Button
                key={rarity}
                type="button"
                size="sm"
                variant={
                  condition.rarities.includes(rarity) ? "default" : "outline"
                }
                onClick={() => toggleRarity(rarity)}
              >
                {t(`itemRarity.${rarity}`, { defaultValue: rarity })}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("bingo.tileEditor.npcTypes")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {NPC_TYPE_OPTIONS.map((npcType) => (
              <Button
                key={npcType}
                type="button"
                size="sm"
                variant={
                  condition.npcTypes.includes(npcType) ? "default" : "outline"
                }
                onClick={() => toggleNpcType(npcType)}
              >
                {t(`npcType.${npcType}`, { defaultValue: npcType })}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("bingo.tileEditor.npcNamePattern")}</Label>
            <Input
              value={condition.npcNamePattern ?? ""}
              onChange={(event) =>
                onChange({
                  ...condition,
                  npcNamePattern: event.target.value || null,
                })
              }
              placeholder={t("bingo.tileEditor.npcNamePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("bingo.tileEditor.itemNamePattern")}</Label>
            <Input
              value={condition.itemNamePattern ?? ""}
              onChange={(event) =>
                onChange({
                  ...condition,
                  itemNamePattern: event.target.value || null,
                })
              }
              placeholder={t("bingo.tileEditor.itemNamePlaceholder")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("bingo.tileEditor.minLvl")}</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={condition.minNpcLvl ?? ""}
              onChange={(event) =>
                onChange({
                  ...condition,
                  minNpcLvl: parseLevel(event.target.value),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("bingo.tileEditor.maxLvl")}</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={condition.maxNpcLvl ?? ""}
              onChange={(event) =>
                onChange({
                  ...condition,
                  maxNpcLvl: parseLevel(event.target.value),
                })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  if (condition.kind === "KILL") {
    const toggleNpcType = (npcType: NpcTypeEnum) =>
      onChange({ ...condition, npcTypes: xor(condition.npcTypes, [npcType]) });

    return (
      <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-3.5">
        <div className="space-y-2">
          <Label>{t("bingo.tileEditor.npcTypes")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {NPC_TYPE_OPTIONS.map((npcType) => (
              <Button
                key={npcType}
                type="button"
                size="sm"
                variant={
                  condition.npcTypes.includes(npcType) ? "default" : "outline"
                }
                onClick={() => toggleNpcType(npcType)}
              >
                {t(`npcType.${npcType}`, { defaultValue: npcType })}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("bingo.tileEditor.npcNamePattern")}</Label>
          <Input
            value={condition.npcNamePattern ?? ""}
            onChange={(event) =>
              onChange({
                ...condition,
                npcNamePattern: event.target.value || null,
              })
            }
            placeholder={t("bingo.tileEditor.npcNamePlaceholder")}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("bingo.tileEditor.minLvl")}</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={condition.minNpcLvl ?? ""}
              onChange={(event) =>
                onChange({
                  ...condition,
                  minNpcLvl: parseLevel(event.target.value),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("bingo.tileEditor.maxLvl")}</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={condition.maxNpcLvl ?? ""}
              onChange={(event) =>
                onChange({
                  ...condition,
                  maxNpcLvl: parseLevel(event.target.value),
                })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  if (condition.kind === "HERO_SIGHTING") {
    return (
      <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-3.5">
        <div className="space-y-1.5">
          <Label>{t("bingo.tileEditor.heroNamePattern")}</Label>
          <Input
            value={condition.heroNamePattern ?? ""}
            onChange={(event) =>
              onChange({
                ...condition,
                heroNamePattern: event.target.value || null,
              })
            }
            placeholder={t("bingo.tileEditor.heroNamePlaceholder")}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("bingo.tileEditor.minLvl")}</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={condition.minHeroLvl ?? ""}
              onChange={(event) =>
                onChange({
                  ...condition,
                  minHeroLvl: parseLevel(event.target.value),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("bingo.tileEditor.maxLvl")}</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={condition.maxHeroLvl ?? ""}
              onChange={(event) =>
                onChange({
                  ...condition,
                  maxHeroLvl: parseLevel(event.target.value),
                })
              }
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">
            {t("bingo.tileEditor.includeManualSightings")}
          </Label>
          <Switch
            checked={condition.includeManual}
            onCheckedChange={(includeManual) =>
              onChange({ ...condition, includeManual })
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-3.5">
      <div className="space-y-2">
        <Label>{t("bingo.tileEditor.battleMetric")}</Label>
        <div className="flex flex-wrap gap-1.5">
          {(["WIN_STREAK", "WINS"] as const).map((metric) => (
            <Button
              key={metric}
              type="button"
              size="sm"
              variant={condition.metric === metric ? "default" : "outline"}
              onClick={() => onChange({ ...condition, metric })}
            >
              {t(`bingo.battleMetric.${metric}`)}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm">
          {t("bingo.tileEditor.matchmakingOnly")}
        </Label>
        <Switch
          checked={condition.matchmakingOnly}
          onCheckedChange={(matchmakingOnly) =>
            onChange({ ...condition, matchmakingOnly })
          }
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm">{t("bingo.tileEditor.excludeFlee")}</Label>
        <Switch
          checked={condition.excludeFlee}
          onCheckedChange={(excludeFlee) =>
            onChange({ ...condition, excludeFlee })
          }
        />
      </div>
    </div>
  );
};
