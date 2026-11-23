import {
  PLAN_LIMIT_BOUNDS,
  PLANS,
  type Plan,
  type PlanGrant,
} from "@lootlog/schema/plans";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import {
  planExtensionText,
  planText,
  planValidityText,
  text,
} from "@/lib/messages";
import {
  isPlanPeriod,
  PLAN_VALIDITY_CHOICES,
  type PlanValidityChoice,
  planValidUntil,
} from "@/lib/plan-validity";

type OverrideValue = number | boolean | null;

type FeatureChoice = "plan" | "on" | "off";

export interface PlanFormField {
  readonly key: string;
  readonly label: string;
  readonly kind: "limit" | "feature";
}

export interface PlanFormChange {
  readonly grant: PlanGrant;
  readonly overrides: Readonly<Record<string, OverrideValue>>;
}

interface PlanFormEntitlement {
  readonly grant: PlanGrant;
  readonly activePlan: Plan;
  readonly overrides: Readonly<Record<string, OverrideValue>>;
  readonly plans: Readonly<
    Record<Plan, Readonly<Record<string, number | boolean>>>
  >;
  readonly changed: { readonly by: string | null; readonly at: string } | null;
}

const planItems = PLANS.map((plan) => ({ value: plan, label: planText[plan] }));

const isLimit = (value: string) => {
  const limit = Number(value);

  return (
    value === "" ||
    (Number.isInteger(limit) &&
      limit >= PLAN_LIMIT_BOUNDS.min &&
      limit <= PLAN_LIMIT_BOUNDS.max)
  );
};

const featureChoice = (value: OverrideValue): FeatureChoice => {
  if (value === null) return "plan";

  return value === true ? "on" : "off";
};

const featureOverride = (choice: string | undefined) =>
  choice === "on" || choice === "off" ? choice === "on" : null;

const limitOverride = (value: string) => (value === "" ? null : Number(value));

const initialValues = (
  fields: ReadonlyArray<PlanFormField>,
  overrides: Readonly<Record<string, OverrideValue>>,
): Record<string, string> =>
  Object.fromEntries(
    fields.map((field) => {
      const value = overrides[field.key] ?? null;

      return [
        field.key,
        field.kind === "feature"
          ? featureChoice(value)
          : value === null
            ? ""
            : String(value),
      ];
    }),
  );

const planDefaultText = (value: number | boolean | undefined) => {
  if (value === true) return text.planFeatureOn;

  if (value === false) return text.planFeatureOff;

  return String(value);
};

const grantStatus = (grant: PlanGrant, activePlan: Plan) => {
  if (grant.plan === "free") return text.planStatusFree;

  if (activePlan === "free" && grant.validUntil !== null)
    return text.planStatusExpired(formatDateTime(grant.validUntil));

  return grant.validUntil === null
    ? text.planStatusUnlimited(planText[grant.plan])
    : text.planStatusUntil(
        planText[grant.plan],
        formatDateTime(grant.validUntil),
      );
};

const validityLabel = (
  choice: PlanValidityChoice,
  grant: PlanGrant,
  extendsGrant: boolean,
) => {
  if (choice === "keep" && grant.validUntil !== null)
    return text.planValidityKeepUntil(formatDateTime(grant.validUntil));

  if (isPlanPeriod(choice) && extendsGrant) return planExtensionText[choice];

  return planValidityText[choice];
};

export function PlanForm({
  id,
  entitlement,
  fields,
  pending,
  onSave,
}: {
  id: string;
  entitlement: PlanFormEntitlement;
  fields: ReadonlyArray<PlanFormField>;
  pending: boolean;
  onSave: (change: PlanFormChange) => void;
}) {
  const { grant, activePlan } = entitlement;
  const runningGrant = activePlan === "premium";
  const [plan, setPlan] = useState<Plan>(activePlan);

  const [validity, setValidity] = useState<PlanValidityChoice>(
    runningGrant ? "keep" : "30d",
  );

  const initial = initialValues(fields, entitlement.overrides);
  const [values, setValues] = useState(initial);
  const extendsGrant = runningGrant && grant.validUntil !== null;

  const validityItems = PLAN_VALIDITY_CHOICES.filter(
    (choice) => choice !== "keep" || runningGrant,
  ).map((choice) => ({
    value: choice,
    label: validityLabel(choice, grant, extendsGrant),
  }));

  const featureItems = (key: string) =>
    (["plan", "on", "off"] as const).map((choice) => ({
      value: choice,
      label:
        choice === "plan"
          ? text.planFeatureFromPlan(
              planDefaultText(entitlement.plans[plan][key]),
            )
          : choice === "on"
            ? text.planFeatureOn
            : text.planFeatureOff,
    }));

  const valid = fields.every(
    (field) => field.kind === "feature" || isLimit(values[field.key] ?? ""),
  );

  const changed =
    plan !== activePlan ||
    (plan === "premium" && validity !== "keep") ||
    fields.some((field) => values[field.key] !== initial[field.key]);

  const submit = () => {
    const overrides = Object.fromEntries(
      fields.map((field) => [
        field.key,
        field.kind === "feature"
          ? featureOverride(values[field.key])
          : limitOverride(values[field.key] ?? ""),
      ]),
    );

    onSave({
      grant:
        plan === "free"
          ? { plan, validUntil: null }
          : { plan, validUntil: planValidUntil(grant, validity, Date.now()) },
      overrides,
    });
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();

        if (valid && changed) submit();
      }}
    >
      <dl className="grid gap-1 text-sm">
        <dt className="font-medium">
          {grantStatus(grant, entitlement.activePlan)}
        </dt>
        {entitlement.changed ? (
          <dd className="text-muted-foreground">
            {text.planChanged(formatDateTime(entitlement.changed.at))}
          </dd>
        ) : null}
      </dl>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-plan`}>{text.planLabel}</Label>
          <Select
            items={planItems}
            value={plan}
            onValueChange={(value) => {
              if (value !== null) setPlan(value);
            }}
          >
            <SelectTrigger id={`${id}-plan`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {planItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {plan === "premium" ? (
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-validity`}>{text.planValidityLabel}</Label>
            <Select
              items={validityItems}
              value={validity}
              onValueChange={(value) => {
                if (value !== null) setValidity(value);
              }}
            >
              <SelectTrigger id={`${id}-validity`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {validityItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold">
          {text.planOverridesHeading}
        </legend>
        <p className="text-sm text-muted-foreground">
          {text.planOverridesDescription}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => {
            const inputId = `${id}-${field.key}`;

            if (field.kind === "feature") {
              const items = featureItems(field.key);

              return (
                <div key={field.key} className="grid gap-1.5">
                  <Label htmlFor={inputId}>{field.label}</Label>
                  <Select
                    items={items}
                    value={values[field.key] ?? "plan"}
                    onValueChange={(value) => {
                      if (value !== null)
                        setValues((current) => ({
                          ...current,
                          [field.key]: value,
                        }));
                    }}
                  >
                    <SelectTrigger id={inputId} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            return (
              <div key={field.key} className="grid gap-1.5">
                <Label htmlFor={inputId}>{field.label}</Label>
                <Input
                  id={inputId}
                  type="number"
                  inputMode="numeric"
                  min={PLAN_LIMIT_BOUNDS.min}
                  max={PLAN_LIMIT_BOUNDS.max}
                  step={1}
                  placeholder={text.planLimitPlaceholder(
                    planDefaultText(entitlement.plans[plan][field.key]),
                  )}
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                />
              </div>
            );
          })}
        </div>
      </fieldset>
      <div>
        <Button
          type="submit"
          loading={pending}
          disabled={!valid || !changed || pending}
        >
          {text.planSave}
        </Button>
      </div>
    </form>
  );
}
