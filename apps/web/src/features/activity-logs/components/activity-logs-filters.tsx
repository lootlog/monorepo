import { useState, useRef } from "react";
import { useActivityLogsFilters } from "@/hooks/use-activity-logs-filters";
import { ActivityLogsFiltersMobile } from "./activity-logs-filters-mobile";
import { ActivityLogsFiltersDesktop } from "./activity-logs-filters-desktop";
import type {
  ActivityType,
  ActivitySource,
} from "@/hooks/api/activity-logs/use-activity-logs";

export const ActivityLogsFilters = () => {
  const { filters, setFilters } = useActivityLogsFilters();

  const [typeOpenMobile, setTypeOpenMobile] = useState(false);
  const [sourceOpenMobile, setSourceOpenMobile] = useState(false);

  const lastStateChangeRef = useRef<Record<string, number>>({});

  const handleTypeChange = (value: ActivityType) => {
    const currentTypes = filters.types;
    const newTypes = currentTypes.includes(value)
      ? currentTypes.filter((t) => t !== value)
      : [...currentTypes, value];
    setFilters({ types: newTypes.length > 0 ? newTypes : null });
  };

  const handleSourceChange = (value: ActivitySource) => {
    const currentSources = filters.sources;
    const newSources = currentSources.includes(value)
      ? currentSources.filter((s) => s !== value)
      : [...currentSources, value];
    setFilters({ sources: newSources.length > 0 ? newSources : null });
  };

  const handleStartDateChange = (value: string) => {
    setFilters({ startDate: value ? new Date(value).toISOString() : null });
  };

  const handleEndDateChange = (value: string) => {
    setFilters({ endDate: value ? new Date(value).toISOString() : null });
  };

  const handleNameChange = (value: string) => {
    setFilters({ name: value || null });
  };

  const activeFiltersCount =
    filters.types.length +
    filters.sources.length +
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0) +
    (filters.name ? 1 : 0);

  const createDebouncedHandler = (
    key: string,
    setter: (value: boolean) => void,
  ) => {
    return (open: boolean) => {
      const now = Date.now();
      const lastChange = lastStateChangeRef.current[key] || 0;
      const timeSinceLastChange = now - lastChange;

      if (timeSinceLastChange < 100) {
        return;
      }

      lastStateChangeRef.current[key] = now;
      setter(open);
    };
  };

  const handleTypeOpenMobile = createDebouncedHandler(
    "typeMobile",
    setTypeOpenMobile,
  );
  const handleSourceOpenMobile = createDebouncedHandler(
    "sourceMobile",
    setSourceOpenMobile,
  );

  return (
    <div className="sticky top-0 z-10 bg-background border-b p-4">
      <div className="md:hidden">
        <ActivityLogsFiltersMobile
          types={filters.types as ActivityType[]}
          sources={filters.sources as ActivitySource[]}
          startDate={filters.startDate}
          endDate={filters.endDate}
          name={filters.name}
          activeFiltersCount={activeFiltersCount}
          typeOpen={typeOpenMobile}
          sourceOpen={sourceOpenMobile}
          onTypeOpenChange={handleTypeOpenMobile}
          onSourceOpenChange={handleSourceOpenMobile}
          onTypeChange={handleTypeChange}
          onSourceChange={handleSourceChange}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          onNameChange={handleNameChange}
        />
      </div>

      <div className="hidden md:block">
        <ActivityLogsFiltersDesktop
          types={filters.types as ActivityType[]}
          sources={filters.sources as ActivitySource[]}
          startDate={filters.startDate}
          endDate={filters.endDate}
          name={filters.name}
          onTypeChange={handleTypeChange}
          onSourceChange={handleSourceChange}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          onNameChange={handleNameChange}
        />
      </div>
    </div>
  );
};
