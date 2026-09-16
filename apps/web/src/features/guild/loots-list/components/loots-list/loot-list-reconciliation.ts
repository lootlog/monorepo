// One dirty bit and one timer per open list, independent of event volume.
export function createLootListReconciliation({
  refresh,
  canRefresh,
}: {
  refresh: () => Promise<void>;
  canRefresh: () => boolean;
}) {
  let dirty = false;
  let running = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;

  const schedule = () => {
    if (disposed || !dirty || running || timer || !canRefresh()) return;
    timer = setTimeout(
      () => {
        timer = undefined;
        void run();
      },
      Math.min(30_000 * 2 ** failures, 300_000) + Math.random() * 5_000,
    );
  };

  const run = async () => {
    if (disposed || running || !canRefresh()) return;

    if (timer) clearTimeout(timer);
    timer = undefined;
    running = true;
    dirty = false;

    try {
      await refresh();
      failures = 0;
    } catch {
      dirty = true;
      failures = Math.min(failures + 1, 4);
    } finally {
      running = false;
      schedule();
    }
  };

  return {
    markDirty() {
      dirty = true;
      schedule();
    },
    resume: schedule,
    dispose() {
      disposed = true;

      if (timer) clearTimeout(timer);
    },
  };
}
