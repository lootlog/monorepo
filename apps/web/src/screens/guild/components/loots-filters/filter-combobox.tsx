import { MultiSelect } from "components/ui/multi-select";
import { FC, useState } from "react";

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
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const handleSelect = (name: string, options: string[]) => {
    onSelect?.(name, options);
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <span className="text-xs font-semibold px-3">{label}</span>}
      <MultiSelect
        options={options}
        onValueChange={setSelectedOptions}
        onClose={(options) => handleSelect(name, options)}
        defaultValue={defaultValue}
        value={selectedOptions}
        placeholder={placeholder}
        variant="inverted"
        animation={2}
        maxCount={1}
        controlledSearch={controlledSearch}
        commandSearch={commandSearch}
        onSearchChange={onSearchChange}
        searchValue={searchValue}
        loading={loading}
      />
    </div>
  );
};
