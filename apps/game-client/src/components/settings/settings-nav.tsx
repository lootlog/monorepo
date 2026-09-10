import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "cn";
import { Search, type LucideIcon } from "lucide-react";
import type { FC, KeyboardEvent } from "react";

export type SettingsNavDomain = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type SettingsNavProps = {
  domains: SettingsNavDomain[];
  activeDomainId: string;
  compact: boolean;
  label: string;
  searchLabel: string;
  onSelect: (domainId: string) => void;
  onOpenSearch: () => void;
};

const railButtonClassName =
  "ll-custom-cursor-pointer ll:flex ll:size-7 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:text-gray-300 ll:transition-colors ll:hover:bg-white/5 ll:hover:text-gray-100 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:aria-current:bg-white/10 ll:aria-current:text-gray-100";

const moveRailFocus = (event: KeyboardEvent<HTMLDivElement>) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

  const buttons = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
  ];

  const index = buttons.findIndex(
    (button) => button === document.activeElement,
  );

  if (index === -1) return;
  event.preventDefault();
  const offset = event.key === "ArrowDown" ? 1 : -1;
  buttons[(index + offset + buttons.length) % buttons.length]?.focus();
};

/**
 * Domain navigation: icon and label list when the window is wide, an icon
 * rail with the search entry point when it is narrow.
 */
export const SettingsNav: FC<SettingsNavProps> = ({
  domains,
  activeDomainId,
  compact,
  label,
  searchLabel,
  onSelect,
  onOpenSearch,
}) => {
  if (compact) {
    return (
      <div
        className="ll:flex ll:h-full ll:w-9 ll:shrink-0 ll:flex-col ll:items-center ll:gap-0.5 ll:border-0 ll:border-r ll:border-gray-400/30 ll:bg-black/15 ll:px-1 ll:py-1"
        onKeyDown={moveRailFocus}
      >
        <button
          type="button"
          aria-label={searchLabel}
          title={searchLabel}
          onClick={onOpenSearch}
          className={cn(railButtonClassName, "ll:mb-1")}
        >
          <Search className="ll:size-4" aria-hidden="true" />
        </button>
        {domains.map((domain) => (
          <button
            key={domain.id}
            type="button"
            aria-label={domain.label}
            title={domain.label}
            aria-current={domain.id === activeDomainId}
            onClick={() => onSelect(domain.id)}
            className={railButtonClassName}
          >
            <domain.icon className="ll:size-4" aria-hidden="true" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <TabsList
      variant="line"
      className="ll:h-auto ll:w-full ll:flex-col ll:items-stretch ll:justify-start ll:gap-0.5 ll:p-0 ll:group-data-horizontal/tabs:h-auto"
      aria-label={label}
      aria-orientation="vertical"
    >
      {domains.map((domain) => (
        <TabsTrigger
          key={domain.id}
          value={domain.id}
          className="ll:h-auto ll:min-h-7 ll:w-full ll:justify-start ll:gap-2 ll:rounded-sm ll:px-2 ll:py-1 ll:text-left ll:text-xs ll:font-semibold ll:text-muted-foreground ll:transition-none ll:hover:bg-accent ll:hover:text-foreground ll:data-active:bg-accent ll:data-active:text-foreground ll:after:hidden"
        >
          <domain.icon className="ll:size-3.5 ll:shrink-0" aria-hidden="true" />
          <span className="ll:truncate">{domain.label}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
};
