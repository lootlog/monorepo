import {
  ORGANIZATION_LIMIT_BOUNDS,
  type OrganizationLimits,
} from "@lootlog/schema/admin-organizations";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { useState } from "react";
import { text } from "@/lib/messages";
import { useOrganizationAction } from "@/lib/use-organization-action";

const fields = [
  { key: "documentLimit", label: text.limitDocuments },
  { key: "notificationRuleLimit", label: text.limitNotificationRules },
] as const;

const isLimit = (value: number) =>
  Number.isInteger(value) &&
  value >= ORGANIZATION_LIMIT_BOUNDS.min &&
  value <= ORGANIZATION_LIMIT_BOUNDS.max;

export function OrganizationLimitsForm({
  guildId,
  limits,
}: {
  guildId: string;
  limits: OrganizationLimits;
}) {
  const [values, setValues] = useState({
    documentLimit: String(limits.documentLimit),
    notificationRuleLimit: String(limits.notificationRuleLimit),
  });

  const { run, pending } = useOrganizationAction(guildId);

  const next = {
    documentLimit: Number(values.documentLimit),
    notificationRuleLimit: Number(values.notificationRuleLimit),
  };

  const valid =
    values.documentLimit !== "" &&
    values.notificationRuleLimit !== "" &&
    isLimit(next.documentLimit) &&
    isLimit(next.notificationRuleLimit);

  const changed =
    next.documentLimit !== limits.documentLimit ||
    next.notificationRuleLimit !== limits.notificationRuleLimit;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();

        if (valid && changed) void run({ action: "limits", limits: next });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className="grid gap-1.5">
            <Label htmlFor={`limit-${field.key}`}>{field.label}</Label>
            <Input
              id={`limit-${field.key}`}
              type="number"
              inputMode="numeric"
              min={ORGANIZATION_LIMIT_BOUNDS.min}
              max={ORGANIZATION_LIMIT_BOUNDS.max}
              step={1}
              required
              value={values[field.key]}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
              }
            />
          </div>
        ))}
      </div>
      <div>
        <Button
          type="submit"
          disabled={!valid || !changed || pending !== undefined}
        >
          {text.limitsSave}
        </Button>
      </div>
    </form>
  );
}
