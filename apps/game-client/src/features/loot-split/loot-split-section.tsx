import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { LootSplitChoiceChip } from "./loot-split-choice-chip";
import { LootSplitItemTile } from "./loot-split-item-tile";
import {
  getLootSplitStatus,
  type LootSplit,
  type LootSplitStatus,
} from "./loot-split-model";
import { LootSplitStatusCount } from "./loot-split-status-count";
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

  // Only choices this client knows count; a loot filter keeps its player's.
  const wanted = split.items.map(
    (item) =>
      rows.filter(({ view }) => (view?.choices[item.id] ?? 0) > 0).length,
  );

  const remaining =
    split.phase === "open"
      ? Math.min(
          1,
          Math.max(0, split.deadline - now) /
            Math.max(1, split.deadline - split.openedAt),
        )
      : 0;

  return (
    <section
      aria-label={title}
      className={cn(
        "ll:flex ll:flex-col ll:border-b ll:border-white/10 ll:px-2 ll:pt-1.5 ll:pb-2 ll:last:border-b-0",
        split.phase !== "open" && "ll:opacity-60",
      )}
    >
      <header className="ll:flex ll:h-4 ll:items-center ll:justify-between ll:gap-3 ll:text-[11px]">
        <div className="ll:flex ll:items-center ll:gap-2">
          {isOwn ? null : (
            <h3 className="ll:m-0 ll:text-[11px] ll:font-semibold">{title}</h3>
          )}
          {choosing > 0 || unknown > 0 || timedOut > 0 ? (
            <span className="ll:flex ll:gap-2">
              {choosing > 0 ? (
                <LootSplitStatusCount
                  status="choosing"
                  count={choosing}
                  label={t("choosingCount", { count: choosing })}
                  className="ll:text-amber-300"
                />
              ) : null}
              {timedOut > 0 ? (
                <LootSplitStatusCount
                  status="timedOut"
                  count={timedOut}
                  label={t("timedOutCount", { count: timedOut })}
                  className="ll:text-rose-300"
                />
              ) : null}
              {unknown > 0 ? (
                <LootSplitStatusCount
                  status="unknown"
                  count={unknown}
                  label={t("unknownCount", { count: unknown })}
                  className="ll:text-white/55"
                />
              ) : null}
            </span>
          ) : null}
        </div>
        <span className="ll:tabular-nums ll:text-white/70">
          {split.phase === "open"
            ? t("secondsLeft", {
                seconds: Math.max(0, Math.ceil((split.deadline - now) / 1_000)),
              })
            : split.phase === "resolved"
              ? t("resolved")
              : t("expired")}
        </span>
      </header>
      {split.phase === "open" ? (
        <div
          aria-hidden
          className="ll:mt-1.5 ll:mb-2 ll:h-0.5 ll:overflow-hidden ll:rounded-full ll:bg-white/12"
        >
          {/* The store ticks every 500 ms; the transition fills the gap. */}
          <div
            className="ll:h-full ll:origin-left ll:rounded-full ll:bg-white/55 ll:transition-transform ll:duration-500 ll:ease-linear ll:motion-reduce:transition-none"
            style={{ transform: `scaleX(${remaining})` }}
          />
        </div>
      ) : (
        <div className="ll:h-2" />
      )}
      <table className="ll:-mx-1 ll:w-[calc(100%+0.5rem)] ll:border-separate ll:border-spacing-x-1 ll:border-spacing-y-0 ll:text-xs">
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
                className="ll:w-6 ll:p-0 ll:pb-1"
              >
                <LootSplitItemTile item={item} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ participant, status, view }) => (
            <tr key={participant.characterId} className="ll:h-6">
              <th
                scope="row"
                title={
                  view?.autoAccept === "newFight"
                    ? t("status.acceptedByNewFight")
                    : view?.autoAccept === "lootFilter"
                      ? t("status.acceptedByLootFilter")
                      : t(`status.${status}`)
                }
                className="ll:p-0 ll:pr-1.5 ll:text-left ll:font-normal"
              >
                <span className="ll:flex ll:items-center ll:gap-1.5 ll:whitespace-nowrap">
                  <LootSplitStatusIcon
                    status={status}
                    byLootFilter={view?.autoAccept === "lootFilter"}
                  />
                  <span
                    className={cn(
                      "ll:max-w-26 ll:truncate",
                      participant.characterId === heroId && "ll:text-sky-300",
                      status === "unknown" && "ll:text-white/50",
                    )}
                  >
                    {participant.name}
                  </span>
                </span>
              </th>
              {split.items.map((item) => {
                const choice = view?.choices[item.id];

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
                  <td key={item.id} className="ll:p-0 ll:text-center">
                    <LootSplitChoiceChip choice={choice} label={label} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="ll:p-0">
              <span className="ll:sr-only">{t("wantedRow")}</span>
            </th>
            {split.items.map((item, index) => (
              <td
                key={item.id}
                title={t("wantedCount", { count: wanted[index] })}
                className={cn(
                  "ll:p-0 ll:pt-1 ll:text-center ll:text-[10px] ll:leading-3 ll:tabular-nums",
                  wanted[index]
                    ? "ll:font-semibold ll:text-emerald-300"
                    : "ll:text-white/45",
                )}
              >
                {wanted[index]}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </section>
  );
};
