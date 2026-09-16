export type LootListFreshness = "current" | "stale" | "refreshing" | "error";

// One dirty bit and one timer per open list, independent of event volume.
export function createLootListReconciliation({
  refresh,
  canRefresh,
  onChange,
}: {
  refresh: () => Promise<void>;
  canRefresh: () => boolean;
  onChange: (state: LootListFreshness) => void;
}) {
  let dirty = false;
  let running = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let state: LootListFreshness = "current";

  const report = (next: LootListFreshness) => {
    if (disposed || state === next) return;
    state = next;
    onChange(next);
  };

  const schedule = () => {
    if (
      disposed ||
      !dirty ||
      running ||
      timer ||
      state === "error" ||
      !canRefresh()
    )
      return;
    timer = setTimeout(
      () => {
        timer = undefined;
        void run();
      },
      30_000 + Math.random() * 5_000,
    );
  };

  const run = async () => {
    if (disposed || running || !canRefresh()) return;

    if (timer) clearTimeout(timer);
    timer = undefined;
    running = true;
    dirty = false;
    report("refreshing");

    try {
      await refresh();
      report(dirty ? "stale" : "current");
    } catch {
      dirty = true;
      report("error");
    } finally {
      running = false;
      schedule();
    }
  };

  return {
    markDirty() {
      dirty = true;

      if (!running && state !== "error") report("stale");
      schedule();
    },
    revalidate() {
      dirty = true;
      report("stale");
      schedule();
    },
    resume: schedule,
    retry: run,
    dispose() {
      disposed = true;

      if (timer) clearTimeout(timer);
    },
  };
}
