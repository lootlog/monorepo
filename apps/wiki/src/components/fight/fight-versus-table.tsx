import { cn } from "cn";
import { BATTLE_TEXT_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";
import { t } from "@/i18n/messages";

type VersusCell = { value: number; text: string };

export type VersusRow = {
  id: string;
  label: string;
  mine: VersusCell;
  theirs: VersusCell;
  better?: "higher" | "lower";
};

export type VersusSection = {
  id: string;
  title: string;
  rows: readonly VersusRow[];
};

const leads = (own: number, other: number, better: VersusRow["better"]) => {
  if (better === undefined) return false;

  return better === "higher" ? own > other : own < other;
};

const CELL_CLASS = "py-[3px] pl-3 text-right whitespace-nowrap tabular-nums";

function valueClass(isLeading: boolean, teamClass: string) {
  return isLeading ? cn("font-semibold", teamClass) : "text-foreground/80";
}

export function FightVersusTable({
  caption,
  sections,
}: {
  caption: string;
  sections: readonly VersusSection[];
}) {
  return (
    <table className="w-full text-[0.8125rem]">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="text-xs">
          <td />
          <th
            scope="col"
            className={cn(
              "pb-1 pl-3 text-right font-semibold",
              BATTLE_TEXT_COLORS.team.friendly,
            )}
          >
            {t("fightPage.myName")}
          </th>
          <th
            scope="col"
            className={cn(
              "pb-1 pl-3 text-right font-semibold",
              BATTLE_TEXT_COLORS.team.enemy,
            )}
          >
            {t("fightPage.opponentName")}
          </th>
        </tr>
      </thead>
      {sections
        .filter((section) => section.rows.length > 0)
        .map((section) => (
          <tbody key={section.id}>
            <tr>
              <th
                scope="colgroup"
                colSpan={3}
                className="border-b border-border/50 pt-3 pb-1 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {section.title}
              </th>
            </tr>
            {section.rows.map((row) => (
              <tr key={row.id} className="hover:bg-accent/35">
                <th
                  scope="row"
                  className="py-[3px] text-left font-normal text-muted-foreground"
                >
                  {row.label}
                </th>
                <td
                  className={cn(
                    CELL_CLASS,
                    valueClass(
                      leads(row.mine.value, row.theirs.value, row.better),
                      BATTLE_TEXT_COLORS.team.friendly,
                    ),
                  )}
                >
                  {row.mine.text}
                </td>
                <td
                  className={cn(
                    CELL_CLASS,
                    valueClass(
                      leads(row.theirs.value, row.mine.value, row.better),
                      BATTLE_TEXT_COLORS.team.enemy,
                    ),
                  )}
                >
                  {row.theirs.text}
                </td>
              </tr>
            ))}
          </tbody>
        ))}
    </table>
  );
}
