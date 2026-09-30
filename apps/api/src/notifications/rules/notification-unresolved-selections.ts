import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { notificationRuleUnresolvedSelectionTable } from "#src/database/drizzle/schema";
import type { NotificationRuleUnresolvedSelection } from "#src/contracts/notifications/schemas";

/**
 * Saved selections the LOO-38 repair could not map to what the rule matches.
 * They stay visible on the rule until a member saves a selection without the
 * id; the repair never rewrites the rule's filters itself.
 */

type Executor = Pick<ApiDatabaseValue, "select" | "delete">;

export const readUnresolvedSelections = Effect.fnUntraced(function* (
  database: Executor,
  ruleIds: readonly number[],
) {
  const result = new Map<number, NotificationRuleUnresolvedSelection[]>();

  if (ruleIds.length === 0) return result;

  const rows = yield* database
    .select()
    .from(notificationRuleUnresolvedSelectionTable)
    .where(
      inArray(notificationRuleUnresolvedSelectionTable.ruleId, [...ruleIds]),
    )
    .orderBy(
      asc(notificationRuleUnresolvedSelectionTable.ruleId),
      asc(notificationRuleUnresolvedSelectionTable.selectedId),
    );

  for (const row of rows) {
    const selections = result.get(row.ruleId) ?? [];

    selections.push({
      kind: row.kind,
      selectedId: row.selectedId,
      selectedName: row.selectedName,
      reason: row.reason,
      suggestedId: row.suggestedId,
      suggestedName: row.suggestedName,
    });
    result.set(row.ruleId, selections);
  }

  return result;
});

/**
 * Drops the rule's unresolved selections of `kind` that are no longer among
 * `selectedIds`: the member removed or replaced them. Selections still saved
 * on the rule stay unresolved.
 */
export const resolveUnresolvedSelections = (
  executor: Executor,
  ruleId: number,
  kind: NotificationRuleUnresolvedSelection["kind"],
  selectedIds: readonly number[],
) =>
  executor
    .delete(notificationRuleUnresolvedSelectionTable)
    .where(
      and(
        eq(notificationRuleUnresolvedSelectionTable.ruleId, ruleId),
        eq(notificationRuleUnresolvedSelectionTable.kind, kind),
        selectedIds.length === 0
          ? undefined
          : notInArray(notificationRuleUnresolvedSelectionTable.selectedId, [
              ...selectedIds,
            ]),
      ),
    )
    .pipe(Effect.asVoid);
