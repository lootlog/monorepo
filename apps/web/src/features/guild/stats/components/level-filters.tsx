import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@lootlog/ui/components/input";

type LevelFiltersProps = {
  minLvl: string;
  maxLvl: string;
  onMinLvlChange: (value: string) => void;
  onMaxLvlChange: (value: string) => void;
  inputClassName?: string;
};

export const LevelFilters: React.FC<LevelFiltersProps> = ({
  minLvl,
  maxLvl,
  onMinLvlChange,
  onMaxLvlChange,
  inputClassName = "w-[100px]",
}) => {
  const { t } = useTranslation();
  const minInputRef = useRef<HTMLInputElement>(null);
  const maxInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync input values when props change (e.g., from localStorage load)
  useEffect(() => {
    if (minInputRef.current && minInputRef.current !== document.activeElement) {
      minInputRef.current.value = minLvl;
    }
  }, [minLvl]);

  useEffect(() => {
    if (maxInputRef.current && maxInputRef.current !== document.activeElement) {
      maxInputRef.current.value = maxLvl;
    }
  }, [maxLvl]);

  const handleMinLvlInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    // Only allow digits
    if (value !== "" && !/^\d+$/.test(value)) {
      e.currentTarget.value = minLvl;
      return;
    }
    // Debounce the state update
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onMinLvlChange(value);
    }, 300);
  };

  const handleMaxLvlInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    // Only allow digits
    if (value !== "" && !/^\d+$/.test(value)) {
      e.currentTarget.value = maxLvl;
      return;
    }
    // Debounce the state update
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onMaxLvlChange(value);
    }, 300);
  };

  return (
    <>
      <Input
        ref={minInputRef}
        type="text"
        inputMode="numeric"
        placeholder={t("kills.filters.minLevel")}
        defaultValue={minLvl}
        onInput={handleMinLvlInput}
        className={inputClassName}
      />
      <Input
        ref={maxInputRef}
        type="text"
        inputMode="numeric"
        placeholder={t("kills.filters.maxLevel")}
        defaultValue={maxLvl}
        onInput={handleMaxLvlInput}
        className={inputClassName}
      />
    </>
  );
};
