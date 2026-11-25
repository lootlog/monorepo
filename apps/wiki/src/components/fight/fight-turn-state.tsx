import { formatDecimal, formatNumber } from "@lootlog/domain/locale";
import { t } from "@/i18n/messages";
import type { FighterSnapshot } from "@/lib/fight/fight-snapshot";
import { nextActionLabel } from "@/lib/fight/fight-turn-labels";
import { FightVersusTable, type VersusRow } from "./fight-versus-table";

type Numeric = (fighter: FighterSnapshot) => number;

type Side = {
  readonly before: FighterSnapshot;
  readonly after: FighterSnapshot;
};

const speed = (value: number) => formatDecimal(Math.round(value * 100) / 100);

const cell = (side: Side, read: Numeric, format: (value: number) => string) => {
  const before = read(side.before);
  const after = read(side.after);

  return {
    value: after,
    text:
      before === after ? format(after) : `${format(before)} → ${format(after)}`,
  };
};

const row = (
  sides: readonly [Side, Side],
  id: string,
  read: Numeric,
  format: (value: number) => string = formatNumber,
): VersusRow => ({
  id,
  label: t(`fightPage.turn.stats.${id}`),
  mine: cell(sides[0], read, format),
  theirs: cell(sides[1], read, format),
});

const percent = (value: number) => `${formatNumber(value)}%`;

const whenAny = (
  sides: readonly [Side, Side],
  read: Numeric,
  rows: () => VersusRow[],
) =>
  sides.some((side) => read(side.before) > 0 || read(side.after) > 0)
    ? rows()
    : [];

export function FightTurnState({
  before,
  after,
}: {
  before: readonly FighterSnapshot[];
  after: readonly FighterSnapshot[];
}) {
  const [myBefore, theirBefore] = before;
  const [myAfter, theirAfter] = after;

  if (!myBefore || !theirBefore || !myAfter || !theirAfter) return null;

  const sides = [
    { before: myBefore, after: myAfter },
    { before: theirBefore, after: theirAfter },
  ] as const;

  const nextAction = (side: Side) => ({
    value: 0,
    text: nextActionLabel(side.after.nextAction),
  });

  return (
    <FightVersusTable
      caption={t("fightPage.turn.stateCaption")}
      sections={[
        {
          id: "resources",
          title: t("fightPage.turn.sections.resources"),
          rows: [
            row(sides, "hp", (fighter) => fighter.hp),
            ...whenAny(
              sides,
              (fighter) => fighter.maxMana,
              () => [row(sides, "mana", (fighter) => fighter.mana)],
            ),
            ...whenAny(
              sides,
              (fighter) => fighter.maxEnergy,
              () => [row(sides, "energy", (fighter) => fighter.energy)],
            ),
            row(sides, "combo", (fighter) => fighter.combo),
          ],
        },
        {
          id: "defence",
          title: t("fightPage.turn.sections.defence"),
          rows: [
            ...whenAny(
              sides,
              (fighter) => fighter.maxAbsorb,
              () => [row(sides, "absorb", (fighter) => fighter.absorb)],
            ),
            ...whenAny(
              sides,
              (fighter) => fighter.maxAbsorbMagic,
              () => [
                row(sides, "absorbMagic", (fighter) => fighter.absorbMagic),
              ],
            ),
            row(sides, "armor", (fighter) => fighter.armor),
            ...(
              [
                ["resistFire", "fire"],
                ["resistFrost", "frost"],
                ["resistLight", "light"],
                ["resistPoison", "poison"],
              ] as const
            ).flatMap(([id, element]) =>
              whenAny(
                sides,
                (fighter) => fighter.resistances[element],
                () => [
                  row(
                    sides,
                    id,
                    (fighter) => fighter.resistances[element],
                    percent,
                  ),
                ],
              ),
            ),
          ],
        },
        {
          id: "tempo",
          title: t("fightPage.turn.sections.tempo"),
          rows: [
            row(sides, "attackSpeed", (fighter) => fighter.attackSpeed, speed),
            ...whenAny(
              sides,
              (fighter) => fighter.stepsForward,
              () => [
                row(sides, "stepsForward", (fighter) => fighter.stepsForward),
              ],
            ),
            {
              id: "nextAction",
              label: t("fightPage.turn.stats.nextAction"),
              mine: nextAction(sides[0]),
              theirs: nextAction(sides[1]),
            },
          ],
        },
      ]}
    />
  );
}
