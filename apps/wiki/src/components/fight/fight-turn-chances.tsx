import { cn } from "cn";
import { formatDecimal } from "@lootlog/domain/locale";
import { t } from "@/i18n/messages";
import { MAX_EVADE_OR_BLOCK } from "@/lib/fight/fight-defence";
import type { EvadeChance } from "@/lib/fight/fight-chances";
import type { FightEvent } from "@/lib/fight/fight-events";

type StrikeEvent = Extract<FightEvent, { kind: "strike" }>;

type ChanceRow = {
  id: string;
  chance: number;
  happened: boolean;
  detail?: string;
};

const tenths = (value: number) => formatDecimal(Math.round(value * 10) / 10);

const shown = (value: number) => `${tenths(value)}%`;

const evadeDetail = ({ points, adrenaline, reduction }: EvadeChance) =>
  [
    t("fightPage.turn.evadeParts.points", { value: tenths(points) }),
    ...(adrenaline > 0
      ? [
          t("fightPage.turn.evadeParts.adrenaline", {
            value: formatDecimal(adrenaline),
          }),
        ]
      : []),
    ...(reduction > 0
      ? [
          t("fightPage.turn.evadeParts.reduction", {
            value: formatDecimal(reduction),
          }),
        ]
      : []),
    ...(points + adrenaline - reduction > MAX_EVADE_OR_BLOCK
      ? [t("fightPage.turn.evadeParts.cap")]
      : []),
  ].join(", ");

const chanceRows = (event: StrikeEvent): ChanceRow[] => {
  const { chances } = event;

  if (!chances) return [];

  const optional = (row: ChanceRow) =>
    row.chance > 0 || row.happened ? [row] : [];

  return [
    {
      id: "evade",
      chance: chances.evade?.chance ?? 0,
      happened: event.evaded,
      detail: chances.evade
        ? evadeDetail(chances.evade)
        : t("fightPage.turn.unavoidable"),
    },
    ...optional({
      id: "parry",
      chance: chances.parry,
      happened: event.parried,
    }),
    ...optional({
      id: "arrowBlock",
      chance: chances.arrowBlock,
      happened: event.arrowBlocked,
    }),
    ...optional({
      id: "block",
      chance: chances.block,
      happened: event.blocked > 0,
    }),
    { id: "crit", chance: chances.crit, happened: event.crit },
    ...(chances.offhandCrit === null
      ? []
      : [
          {
            id: "offhandCrit",
            chance: chances.offhandCrit,
            happened: event.offhandCrit,
          },
        ]),
    ...optional({
      id: "veryCrit",
      chance: chances.veryCrit,
      happened: event.veryCrit,
    }),
    ...optional({
      id: "pierce",
      chance: chances.pierce,
      happened: event.pierceShown,
    }),
    ...optional({
      id: "pierceBlock",
      chance: chances.pierceBlock,
      happened: event.pierceBlocked,
    }),
    ...optional({
      id: "counter",
      chance: chances.counter,
      happened: event.countered,
    }),
  ];
};

export function FightTurnChances({
  event,
  nameOf,
}: {
  event: StrikeEvent;
  nameOf: (index: number) => string;
}) {
  const rows = chanceRows(event);

  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby="fight-turn-chances"
      className="flex flex-col gap-1"
    >
      <h3
        id="fight-turn-chances"
        className="border-b border-border/50 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {t("fightPage.turn.chancesTitle", {
          attacker: nameOf(event.actor),
          defender: nameOf(event.target),
        })}
      </h3>
      <dl className="flex flex-col text-[0.8125rem]">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col py-[3px]">
            <div className="flex items-baseline gap-2">
              <dt className="text-muted-foreground">
                {t(`fightPage.turn.chances.${row.id}`)}
              </dt>
              <dd className="ml-auto flex items-baseline gap-2 tabular-nums">
                {row.happened ? (
                  <span className="text-xs font-medium text-primary">
                    {t("fightPage.turn.happened")}
                  </span>
                ) : null}
                <span
                  className={cn(
                    row.happened
                      ? "font-semibold text-foreground"
                      : "text-foreground/80",
                  )}
                >
                  {shown(row.chance)}
                </span>
              </dd>
            </div>
            {row.detail ? (
              <dd className="text-xs text-muted-foreground">{row.detail}</dd>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
