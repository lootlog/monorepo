import {
  type AdminOrganizationEntitlement,
  OrganizationEntitlementChange,
} from "@lootlog/schema/plans";
import { Schema } from "effect";
import { type PlanFormField, PlanForm } from "@/components/plan-form";
import { text } from "@/lib/messages";
import { useOrganizationAction } from "@/lib/use-organization-action";

const decodeChange = Schema.decodeUnknownSync(OrganizationEntitlementChange);

const fields: ReadonlyArray<PlanFormField> = [
  { key: "documents", label: text.planLimitDocuments, kind: "limit" },
  {
    key: "notificationRules",
    label: text.planLimitNotificationRules,
    kind: "limit",
  },
];

export function OrganizationPlanForm({
  guildId,
  entitlement,
}: {
  guildId: string;
  entitlement: AdminOrganizationEntitlement;
}) {
  const { run, pending } = useOrganizationAction(guildId);

  return (
    <PlanForm
      id="organization-plan"
      entitlement={entitlement}
      fields={fields}
      pending={pending !== undefined}
      onSave={(change) =>
        void run({ action: "plan", change: decodeChange(change) })
      }
    />
  );
}
