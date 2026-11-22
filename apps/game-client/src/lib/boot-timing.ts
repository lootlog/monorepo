type BootMilestone =
  | "script-start"
  | "bootstrap"
  | "game-initialized"
  | "overlay-committed"
  | "overlay-settled";

const MARK_PREFIX = "lootlog:";

const MEASURED_SPANS: Partial<Record<BootMilestone, BootMilestone>> = {
  bootstrap: "script-start",
  "overlay-committed": "game-initialized",
  "overlay-settled": "overlay-committed",
};

const markName = (milestone: BootMilestone) => `${MARK_PREFIX}${milestone}`;

export function markBootMilestone(milestone: BootMilestone): void {
  performance.mark(markName(milestone));
  const from = MEASURED_SPANS[milestone];

  if (
    !from ||
    performance.getEntriesByName(markName(from), "mark").length === 0
  )
    return;

  performance.measure(`${MARK_PREFIX}${from} → ${milestone}`, {
    start: markName(from),
    end: markName(milestone),
  });
}
