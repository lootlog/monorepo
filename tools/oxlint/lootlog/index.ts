import { eslintCompatPlugin } from "@oxlint/plugins";

import { noPollingLoopInTestsRule } from "./rules/no-polling-loop-in-tests.ts";
import { noRealTimeWaitInTestsRule } from "./rules/no-real-time-wait-in-tests.ts";
import { noTestTimeoutOrUnreasonedSkipRule } from "./rules/no-test-timeout-or-unreasoned-skip.ts";
import { noUnreasonedStateSyncRule } from "./rules/no-unreasoned-state-sync.ts";
import { noWallClockInTestsRule } from "./rules/no-wall-clock-in-tests.ts";
import { requireSuppressionReasonRule } from "./rules/require-suppression-reason.ts";

const lootlogPlugin = eslintCompatPlugin({
  meta: { name: "lootlog" },
  rules: {
    "no-polling-loop-in-tests": noPollingLoopInTestsRule,
    "no-real-time-wait-in-tests": noRealTimeWaitInTestsRule,
    "no-test-timeout-or-unreasoned-skip": noTestTimeoutOrUnreasonedSkipRule,
    "no-unreasoned-state-sync": noUnreasonedStateSyncRule,
    "no-wall-clock-in-tests": noWallClockInTestsRule,
    "require-suppression-reason": requireSuppressionReasonRule,
  },
});

export default lootlogPlugin;
