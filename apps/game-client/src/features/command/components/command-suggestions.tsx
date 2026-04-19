import { AutocompleteSuggestions } from "@/components/ui/autocomplete-suggestions";
import { cn } from "@/lib/utils";
import { BellRing, Swords, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import {
  NOTIFICATION_COMMAND_PREFIX,
  PARTY_COMMAND_PREFIX,
} from "../command-state";

type CommandSuggestion = {
  prefix: string;
  icon: LucideIcon;
  labelKey: string;
  descriptionKey: string;
  accentClassName: string;
};

const COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  {
    prefix: NOTIFICATION_COMMAND_PREFIX,
    icon: BellRing,
    labelKey: "settings.command.suggestions.notification.label",
    descriptionKey: "settings.command.suggestions.notification.description",
    accentClassName:
      "ll:border-amber-400/70 ll:bg-amber-400/10 ll:text-amber-100",
  },
  {
    prefix: PARTY_COMMAND_PREFIX,
    icon: Swords,
    labelKey: "settings.command.suggestions.party.label",
    descriptionKey: "settings.command.suggestions.party.description",
    accentClassName:
      "ll:border-emerald-400/70 ll:bg-emerald-400/10 ll:text-emerald-100",
  },
];

type CommandSuggestionsProps = {
  inputValue: string;
  onSelect: (prefix: string) => void;
};

const selectItem = (item: CommandSuggestion) =>
  item.prefix === NOTIFICATION_COMMAND_PREFIX ? "!" : `${item.prefix} `;

export const useCommandSuggestions = ({
  inputValue,
  onSelect,
}: CommandSuggestionsProps) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const commandQuery = inputValue.startsWith("!")
    ? (inputValue.split(/\s/, 1)[0] ?? "")
    : "";
  const isOpen = commandQuery.startsWith("!") && !/\s/.test(inputValue);
  const filtered = useMemo(
    () =>
      COMMAND_SUGGESTIONS.filter((suggestion) =>
        suggestion.prefix.startsWith(commandQuery),
      ).sort((left, right) => {
        const leftExactMatch = left.prefix === commandQuery ? 1 : 0;
        const rightExactMatch = right.prefix === commandQuery ? 1 : 0;

        if (leftExactMatch !== rightExactMatch) {
          return rightExactMatch - leftExactMatch;
        }

        return left.prefix.length - right.prefix.length;
      }),
    [commandQuery],
  );

  useEffect(() => {
    if (!isOpen || filtered.length === 0) {
      setSelectedIndex(-1);
      return;
    }

    setSelectedIndex((currentSelectedIndex) => {
      if (currentSelectedIndex < 0 || currentSelectedIndex >= filtered.length) {
        return 0;
      }

      return currentSelectedIndex;
    });
  }, [filtered.length, isOpen]);

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
  const { t } = useTranslation();

  return (
    <AutocompleteSuggestions
      items={filtered}
      isOpen={isOpen}
      noResultsMessage={t("settings.command.suggestions.noResults")}
      showNoResults={isOpen && filtered.length === 0}
      onSelect={(item) => onSelect(selectItem(item))}
      selectedIndex={selectedIndex}
      keyExtractor={(item) => item.prefix}
      renderItem={(item, _, isSelected) => (
        <div
          className={cn(
            "ll:flex ll:flex-col ll:gap-1 ll:px-2 ll:py-2 ll:transition-colors",
            isSelected ? "ll:bg-gray-800/95" : "ll:hover:bg-gray-900/90",
          )}
        >
          <div className="ll:flex ll:items-center ll:gap-2">
            <span
              className={cn(
                "ll:flex ll:size-5 ll:items-center ll:justify-center ll:rounded-sm ll:border",
                item.accentClassName,
              )}
            >
              <item.icon className="ll:size-3.5" strokeWidth={2} />
            </span>
            <span className="ll:text-xs ll:font-medium ll:text-white">
              {t(item.labelKey)}
            </span>
            <span className="ll:ml-auto ll:text-[10px] ll:text-gray-500">
              {item.prefix}
            </span>
          </div>
          <span className="ll:text-[10px] ll:leading-4 ll:text-gray-400">
            {t(item.descriptionKey)}
          </span>
        </div>
      )}
      className="ll:bottom-full ll:mb-1"
    />
  );
};
