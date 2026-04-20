import { AutocompleteSuggestions } from "@/components/ui/autocomplete-suggestions";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";

type CommandSuggestion = {
  prefix: string;
  label: string;
  description: string;
};

type CommandSuggestionsProps = {
  inputValue: string;
  onSelect: (prefix: string) => void;
};

const selectItem = (item: CommandSuggestion) =>
  item.prefix === "!" ? "!" : `${item.prefix} `;

export const useCommandSuggestions = ({
  inputValue,
  onSelect,
}: CommandSuggestionsProps) => {
  const { t } = useTranslation("command");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const commandSuggestions: CommandSuggestion[] = [
    {
      prefix: "!grp",
      label: t("command.suggestions.partySearch.label"),
      description: t("command.suggestions.partySearch.description"),
    },
    {
      prefix: "!",
      label: t("command.suggestions.notification.label"),
      description: t("command.suggestions.notification.description"),
    },
  ];

  const isOpen = inputValue.startsWith("!") && inputValue.length <= 4;
  const filtered = commandSuggestions.filter((s) =>
    s.prefix.startsWith(inputValue),
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filtered.length === 0) return false;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
      return true;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev >= filtered.length - 1 ? 0 : prev + 1));
      return true;
    }

    if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      onSelect(selectItem(filtered[selectedIndex]));
      setSelectedIndex(-1);
      return true;
    }

    return false;
  };

  return { isOpen, filtered, selectedIndex, setSelectedIndex, handleKeyDown };
};

export const CommandSuggestions: FC<{
  onSelect: (prefix: string) => void;
  filtered: CommandSuggestion[];
  isOpen: boolean;
  selectedIndex: number;
}> = ({ onSelect, filtered, isOpen, selectedIndex }) => {
  return (
    <AutocompleteSuggestions
      items={filtered}
      isOpen={isOpen}
      onSelect={(item) => onSelect(selectItem(item))}
      selectedIndex={selectedIndex}
      keyExtractor={(item) => item.prefix}
      renderItem={(item, _, isSelected) => (
        <div
          className={`ll:px-2 ll:py-1.5 ll:flex ll:flex-col ll:gap-0.5 ${
            isSelected ? "ll:bg-gray-700" : "ll:hover:bg-gray-800"
          }`}
        >
          <span className="ll:text-xs ll:text-white ll:font-medium">
            {item.label}
          </span>
          <span className="ll:text-[10px] ll:text-gray-400">
            {item.description}
          </span>
        </div>
      )}
      className="ll:bottom-full ll:mb-1"
    />
  );
};
