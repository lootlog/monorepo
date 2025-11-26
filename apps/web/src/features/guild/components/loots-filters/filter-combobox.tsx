import { MultiSelect } from "@/components/ui/multi-select";
import { useEffect, useState, type FC } from "react";

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
  onSearchChange,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    defaultValue ?? [],
  );

  useEffect(() => {
    setSelectedOptions(defaultValue ?? []);
  }, [defaultValue]);

  const handleSelect = (options: string[]) => {
    setSelectedOptions(options);
    onSelect?.(name, options);
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <span className="text-xs font-semibold px-3">{label}</span>}
      <MultiSelect
        options={options}
        onValueChange={handleSelect}
        onClose={() => {}}
        defaultValue={defaultValue}
        value={selectedOptions}
        placeholder={placeholder}
        variant="inverted"
        animation={2}
        maxCount={2}
        controlledSearch={controlledSearch}
        commandSearch={commandSearch}
        onSearchChange={onSearchChange}
        searchValue={searchValue}
        loading={loading}
      />
    </div>
  );
};
