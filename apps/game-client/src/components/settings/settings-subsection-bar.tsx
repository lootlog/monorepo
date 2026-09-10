import { cn } from "cn";
import type { FC } from "react";

export type SettingsSubsectionOption = { id: string; label: string };

type SettingsSubsectionBarProps = {
  label: string;
  options: SettingsSubsectionOption[];
  activeId: string;
  onSelect: (id: string) => void;
};

/** Segmented subsection switcher, styled like the chat filter bar. */
export const SettingsSubsectionBar: FC<SettingsSubsectionBarProps> = ({
  label,
  options,
  activeId,
  onSelect,
}) => (
  <div
    role="group"
    aria-label={label}
    className="ll:flex ll:h-7 ll:shrink-0 ll:items-stretch ll:border-y ll:border-x-0 ll:border-gray-400/40 ll:bg-black/20"
  >
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        aria-current={option.id === activeId}
        onClick={() => onSelect(option.id)}
        className={cn(
          "ll-custom-cursor-pointer ll:flex ll:min-w-0 ll:flex-1 ll:items-center ll:justify-center ll:border-0 ll:bg-transparent ll:px-2 ll:py-0 ll:text-[11px] ll:font-semibold ll:leading-none ll:transition-none ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:focus-visible:-outline-offset-2",
          option.id === activeId
            ? "ll:bg-white/10 ll:text-gray-100"
            : "ll:text-muted-foreground ll:hover:bg-white/5 ll:hover:text-gray-100",
        )}
      >
        <span className="ll:truncate">{option.label}</span>
      </button>
    ))}
  </div>
);
