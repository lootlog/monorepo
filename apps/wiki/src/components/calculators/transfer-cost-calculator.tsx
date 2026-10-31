import { useId, useState } from "react";
import { Field, FieldLabel } from "@lootlog/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { t } from "@/i18n/messages";
import {
  characterTransferCost,
  SERVICES_DOCUMENTATION_URL,
  type TransferRoute,
} from "@/lib/calculators";
import { formatScales } from "@/lib/calculator-format";
import { readNumberInput } from "@/lib/number-input";
import { CalculatorCard } from "./calculator-card";
import { CalculatorNumberField } from "./calculator-number-field";
import { CalculatorResults } from "./calculator-results";

const ROUTES = ["standard", "uniaToPrivate"] as const satisfies TransferRoute[];

const ROUTE_OPTIONS = ROUTES.map((route) => ({
  value: route,
  label: t(`calculators.transfer.routes.${route}`),
}));

const isTransferRoute = (value: string): value is TransferRoute =>
  ROUTES.some((route) => route === value);

/** What moving a character to another world costs. */
export function TransferCostCalculator() {
  const routeFieldId = useId();
  const [level, setLevel] = useState("");
  const [route, setRoute] = useState<TransferRoute>("standard");
  const value = readNumberInput(level, { min: 1, max: 1000 });

  return (
    <CalculatorCard
      id="przeniesienie-postaci"
      title={t("calculators.transfer.title")}
      description={t("calculators.transfer.description")}
      source="official"
      sourceUrl={SERVICES_DOCUMENTATION_URL}
      formula={t("calculators.transfer.formula")}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <CalculatorNumberField
          label={t("calculators.characterLevel")}
          value={level}
          onChange={setLevel}
          min={1}
          max={1000}
        />
        <Field>
          <FieldLabel htmlFor={routeFieldId}>
            {t("calculators.transfer.route")}
          </FieldLabel>
          <Select
            value={route}
            onValueChange={(next) => {
              if (next && isTransferRoute(next)) setRoute(next);
            }}
            items={ROUTE_OPTIONS}
          >
            <SelectTrigger id={routeFieldId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROUTE_OPTIONS.map(({ value: option, label }) => (
                <SelectItem key={option} value={option}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <CalculatorResults
        results={[
          {
            label: t("calculators.transfer.cost"),
            value:
              value === undefined
                ? undefined
                : formatScales(characterTransferCost(value, route)),
          },
        ]}
      />
      {route === "uniaToPrivate" ? (
        <p className="text-xs text-muted-foreground">
          {t("calculators.transfer.uniaFee")}
        </p>
      ) : null}
    </CalculatorCard>
  );
}
