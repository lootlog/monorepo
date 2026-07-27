import { MultiSelect } from "@/components/ui/multi-select";
import { useState, type FC } from "react";
import { ThemeInteractiveFrame } from "@/themes";

type FilterComboboxProps = {
  placeholder: string;
  label?: string;
  options: { value: string; label: string }[];
  onSelect?: (name: string, options: string[]) => void;
  controlledSearch?: boolean;
  commandSearch?: boolean;
  defaultValue?: string[];
  name: string;
  onSearchChange?: (value: string) => void;
  loading?: boolean;
  searchValue?: string;
  minimumSearchLength?: number;
};

export const FilterCombobox: FC<FilterComboboxProps> = ({
  options,
  placeholder,
  label,
  onSelect,
  controlledSearch,
  commandSearch,
  defaultValue,
  name,
  loading,
  searchValue,
  minimumSearchLength,
  onSearchChange,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const selectedOptions = defaultValue ?? [];

  const handleSelect = (options: string[]) => {
    onSelect?.(name, options);
  };

  const hasSelection = selectedOptions.length > 0;

  const multiSelectContent = (
    <MultiSelect
      options={options}
      onValueChange={handleSelect}
      onClose={() => {}}
      defaultValue={defaultValue}
      value={selectedOptions}
      placeholder={placeholder}
      variant="inverted"
      maxCount={2}
      controlledSearch={controlledSearch}
      commandSearch={commandSearch}
      onSearchChange={onSearchChange}
      searchValue={searchValue}
      loading={loading}
      minimumSearchLength={minimumSearchLength}
    />
  );

  return (
    <div
      className="flex flex-col gap-1 w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {label && <span className="text-xs font-semibold px-3">{label}</span>}
      <ThemeInteractiveFrame isHovered={isHovered} isActive={hasSelection}>
        {multiSelectContent}
      </ThemeInteractiveFrame>
    </div>
  );
};
