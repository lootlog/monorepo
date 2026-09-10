import { PageHeader } from "@/components/common/page-header";
import { Button } from "@lootlog/ui/components/button";
import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { Activity, Filter } from "lucide-react";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { WorldSwitcher } from "@/components/common/world-switcher";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import { useTranslation } from "react-i18next";

export type ActivityLogsFiltersHeaderProps = {
  isFiltersOpen: boolean;
  hasActiveFilters: boolean;
  onToggleFilters: () => void;
  worldOptions: Array<{ value: string; label: string }>;
  selectedWorld: string;
  onWorldChange: (world: string) => void;
};

export const ActivityLogsFiltersHeader = ({
  isFiltersOpen,
  hasActiveFilters,
  onToggleFilters,
  worldOptions,
  selectedWorld,
  onWorldChange,
}: ActivityLogsFiltersHeaderProps) => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  return (
    <PageHeader
      icon={Activity}
      title={t("activityLogs.title")}
      actions={
        <>
          {!isMobile && (
            <>
              <Select
                value={selectedWorld || undefined}
                onValueChange={(value) =>
                  onWorldChange(value !== null && value !== "all" ? value : "")
                }
                items={[
                  {
                    value: null,
                    label: <>{t("activityLogs.filters.allWorlds")}</>,
                  },
                  {
                    value: "all",
                    label: <>{t("activityLogs.filters.allWorlds")}</>,
                  },
                  ...worldOptions.map((option) => ({
                    value: option.value,
                    label: <>{capitalizeFirstLetter(option.label)}</>,
                  })),
                ]}
              >
                <SelectTrigger className="h-9 w-48">
                  <SelectValue
                    placeholder={t("activityLogs.filters.allWorlds")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("activityLogs.filters.allWorlds")}
                  </SelectItem>
                  {worldOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {capitalizeFirstLetter(option.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={onToggleFilters}
                variant={isFiltersOpen ? "default" : "outline"}
                size="icon"
                className="relative shrink-0"
              >
                <Filter className="h-4 w-4" />
                {/* The responsive toolbar owns this button; filter changes keep the presence boundary mounted. */}
                {/* eslint-disable-next-line react-doctor/motion-animate-presence-must-outlive-child */}
                <AnimatePresence>
                  {hasActiveFilters && !isFiltersOpen && (
                    <m.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"
                    />
                  )}
                </AnimatePresence>
              </Button>
            </>
          )}

          {isMobile && <WorldSwitcher />}
        </>
      }
    />
  );
};
