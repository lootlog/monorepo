import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  notificationRules: {
    rulesToTargets: r.many.notificationRulesToTargets(),
    jobs: r.many.notificationJobs(),
    watchedItems: r.many.watchedItems(),
  },
  notificationTargets: {
    rulesToTargets: r.many.notificationRulesToTargets(),
    jobs: r.many.notificationJobs(),
  },
  notificationRulesToTargets: {
    rule: r.one.notificationRules({
      from: r.notificationRulesToTargets.ruleId,
      to: r.notificationRules.id,
    }),
    target: r.one.notificationTargets({
      from: r.notificationRulesToTargets.targetId,
      to: r.notificationTargets.id,
    }),
  },
  notificationJobs: {
    rule: r.one.notificationRules({
      from: r.notificationJobs.ruleId,
      to: r.notificationRules.id,
    }),
    target: r.one.notificationTargets({
      from: r.notificationJobs.targetId,
      to: r.notificationTargets.id,
    }),
  },
  watchedItems: {
    rule: r.one.notificationRules({
      from: r.watchedItems.ruleId,
      to: r.notificationRules.id,
    }),
  },
}));
