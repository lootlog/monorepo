import { useId } from "react";
import { Label } from "@lootlog/ui/components/label";
import { Switch } from "@lootlog/ui/components/switch";
import { t } from "@/i18n/messages";

type FightLevelAdvantageSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
};

export function FightLevelAdvantageSwitch({
  checked,
  onChange,
  disabled,
}: FightLevelAdvantageSwitchProps) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
      <Label htmlFor={id} className="text-sm font-normal">
        {t("fightPage.levelAdvantage")}
      </Label>
    </div>
  );
}
