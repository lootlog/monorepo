import { Shirt } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { t } from "@/i18n/messages";

export function CalculatorFromSetButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      icon={<Shirt />}
      title={t("calculators.fromSetDescription")}
      disabled={disabled}
      onClick={onClick}
    >
      {t("calculators.fromSet")}
    </Button>
  );
}
