import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { LootSplitChoiceChip } from "./loot-split-choice-chip";
import { LootSplitItemTile } from "./loot-split-item-tile";
import {
  canPickMust,
  getLootSplitStatus,
  type LootSplit,
  type LootSplitStatus,
} from "./loot-split-model";
import { LootSplitStatusIcon } from "./loot-split-status-icon";

/** Players still choosing come first: they hold the party up. */
const STATUS_ORDER: Record<LootSplitStatus, number> = {
  choosing: 0,
  timedOut: 0,
  unknown: 1,
  accepted: 2,
};

type LootSplitSectionProps = {
  split: LootSplit;
  heroId: string | null;
  isOwn: boolean;
  now: number;
};

/**
 * One split as a participant × item grid. Participants are rows: a party of
 * up to ten outgrows a split's few items, so the grid grows downwards.
 */
export const LootSplitSection: FC<LootSplitSectionProps> = ({
  split,
  heroId,
  isOwn,
  now,
}) => {
  const { t } = useTranslation("lootSplit");

  const rows = split.participants
    .map((participant) => ({
      participant,
      status: getLootSplitStatus(split, participant.characterId, heroId),
      view: split.views[participant.characterId],
    }))
    .toSorted(
      (left, right) => STATUS_ORDER[left.status] - STATUS_ORDER[right.status],
    );

  const choosing = rows.filter(({ status }) => status === "choosing").length;
  const timedOut = rows.filter(({ status }) => status === "timedOut").length;
  const unknown = rows.filter(({ status }) => status === "unknown").length;
  const title = isOwn ? t("ownSplit") : t("otherSplit");

  return (
    <section
      aria-label={title}
      className={cn(
        "ll:flex ll:flex-col ll:gap-1 ll:border-b ll:border-white/10 ll:px-2 ll:py-1.5 ll:last:border-b-0",
        split.phase !== "open" && "ll:opacity-60",
      )}
    >
      <header className="ll:flex ll:items-center ll:justify-between ll:gap-3 ll:text-[11px] ll:font-semibold">
        <h3 className="ll:m-0 ll:text-[11px] ll:font-semibold">{title}</h3>
        {split.phase === "open" ? (
          <span className="ll:flex ll:gap-2 ll:font-normal">
            {choosing > 0 ? (
              <span className="ll:text-amber-300">
                {t("choosingCount", { count: choosing })}
              </span>
            ) : null}
            {unknown > 0 ? (
              <span className="ll:text-white/55">
                {t("unknownCount", { count: unknown })}
              </span>
            ) : null}
            <span className="ll:tabular-nums ll:text-white/70">
              {t("secondsLeft", {
                seconds: Math.max(0, Math.ceil((split.deadline - now) / 1_000)),
              })}
            </span>
          </span>
        ) : (
          <span className="ll:flex ll:gap-2 ll:font-normal">
            {timedOut > 0 ? (
              <span className="ll:text-rose-300">
                {t("timedOutCount", { count: timedOut })}
              </span>
            ) : null}
            <span className="ll:text-white/70">
              {split.phase === "resolved" ? t("resolved") : t("expired")}
            </span>
          </span>
        )}
      </header>
      <table className="ll:-mx-1 ll:self-start ll:border-separate ll:border-spacing-x-1 ll:border-spacing-y-0.5 ll:text-xs">
        <thead>
          <tr>
            <th scope="col">
              <span className="ll:sr-only">{t("participant")}</span>
            </th>
            {split.items.map((item) => (
              <th
                key={item.id}
                scope="col"
                title={item.name}
                className="ll:p-0 ll:pb-0.5"
              >
                <LootSplitItemTile item={item} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ participant, status, view }) => (
            <tr key={participant.characterId}>
              <th
                scope="row"
                title={
                  view?.autoAccept === "newFight"
                    ? t("status.acceptedByNewFight")
                    : view?.autoAccept === "lootFilter"
                      ? t("status.acceptedByLootFilter")
                      : t(`status.${status}`)
                }
                className="ll:pr-2 ll:text-left ll:font-semibold"
              >
                <span className="ll:flex ll:items-center ll:gap-1 ll:whitespace-nowrap">
                  <LootSplitStatusIcon
                    status={status}
                    byLootFilter={view?.autoAccept === "lootFilter"}
                  />
                  <span
                    className={cn(
                      "ll:max-w-28 ll:truncate",
                      participant.characterId === heroId && "ll:text-sky-300",
                      status === "unknown" && "ll:text-white/50",
                    )}
                  >
                    {participant.name}
                  </span>
                  <span className="ll:font-normal ll:text-white/45">
                    {participant.profession}
                  </span>
                </span>
              </th>
              {split.items.map((item) => {
                const choice = view?.choices[item.id];
                const mustAllowed = canPickMust(participant.profession, item);

                const label = t("cellLabel", {
                  player: participant.name,
                  item: item.name,
                  // The game keeps a loot filter's choices from its player.
                  choice: t(
                    view?.autoAccept === "lootFilter"
                      ? "choices.lootFilter"
                      : `choices.${choice ?? "unknown"}`,
                  ),
                });

                return (
                  <td key={item.id} className="ll:text-center">
                    <LootSplitChoiceChip
                      choice={choice}
                      canPickMust={mustAllowed}
                      label={
                        mustAllowed ? `${label} (${t("canPickMust")})` : label
                      }
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};
