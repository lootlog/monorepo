import { upperFirst } from "es-toolkit";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";

export type WorldOption = { value: string; label: string };

/** Base UI filters grouped items when each group carries an `items` array. */
export type WorldGroup = { value: string; label: string; items: WorldOption[] };

export const toWorldOption = (world: string): WorldOption => ({
  value: world,
  label: upperFirst(world),
});

type WorldComboboxProps = {
  groups: WorldGroup[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "strip";
};

/** The searchable, grouped world picker every world switcher shares. */
export const WorldCombobox = ({
  groups,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className,
  variant = "default",
}: WorldComboboxProps) => {
  const { t } = useTranslation("common");

  const selectedOption =
    groups
      .flatMap((group) => group.items)
      .find((option) => option.value === value) ?? null;

  return (
    <Combobox<WorldOption>
      items={groups}
      value={selectedOption}
      onValueChange={(option) => {
        if (option) onValueChange(option.value);
      }}
      isItemEqualToValue={(item, selected) => item.value === selected.value}
      disabled={disabled}
      autoHighlight
    >
      <ComboboxTrigger
        size="sm"
        variant={variant}
        aria-label={t("worldSelector.placeholder")}
        className={cn(variant === "default" && "ll:mb-1", className)}
      >
        <ComboboxValue placeholder={placeholder} />
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput placeholder={t("worldSelector.searchPlaceholder")} />
        <ComboboxEmpty>{t("worldSelector.empty")}</ComboboxEmpty>
        <ComboboxList>
          {(group: WorldGroup) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel>{group.label}</ComboboxLabel>
              <ComboboxCollection>
                {(option: WorldOption) => (
                  <ComboboxItem key={option.value} value={option}>
                    {option.label}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
