import {
  type AdminUserEntitlement,
  UserEntitlementChange,
} from "@lootlog/schema/plans";
import { Schema } from "effect";
import { type PlanFormField, PlanForm } from "@/components/plan-form";
import { text } from "@/lib/messages";
import { useUserAction } from "@/lib/use-user-action";

const decodeChange = Schema.decodeUnknownSync(UserEntitlementChange);

const fields: ReadonlyArray<PlanFormField> = [
  {
    key: "notificationRules",
    label: text.planLimitPersonalRules,
    kind: "limit",
  },
  { key: "watchedItems", label: text.planLimitWatchedItems, kind: "limit" },
  { key: "customThemes", label: text.planLimitCustomThemes, kind: "limit" },
  { key: "apiKeys", label: text.planLimitApiKeys, kind: "limit" },
  {
    key: "equipmentSets",
    label: text.planLimitEquipmentSets,
    kind: "limit",
  },
  {
    key: "characterAuras",
    label: text.planFeatureCharacterAuras,
    kind: "feature",
  },
];

export function UserPlanForm({
  userId,
  entitlement,
}: {
  userId: string;
  entitlement: AdminUserEntitlement;
}) {
  const { run, pending } = useUserAction(userId);

  return (
    <PlanForm
      id="user-plan"
      entitlement={entitlement}
      fields={fields}
      pending={pending !== undefined}
      onSave={(change) =>
        void run({ action: "plan", change: decodeChange(change) })
      }
    />
  );
}
