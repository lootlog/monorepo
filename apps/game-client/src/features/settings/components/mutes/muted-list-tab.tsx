import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsList } from "@/components/settings/settings-list";
import { SettingsListRow } from "@/components/settings/settings-list-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { SettingsToolbar } from "@/components/settings/settings-toolbar";
import { IconButton } from "@/components/ui/icon-button";
import type { SettingsControlId } from "@/features/settings/settings-manifest";
import { Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

type MutedListTabProps<TItem> = {
  controlId: SettingsControlId;
  title: string;
  searchPlaceholder: string;
  /** Shown when nothing is muted at all. */
  emptyLabel: string;
  /** Shown when muted entries exist but none matches the search. */
  noResultsLabel: string;
  isReady: boolean;
  items: readonly TItem[];
  getKey: (item: TItem) => string;
  /** Sort key and the name in the remove button's label. */
  getName: (item: TItem) => string;
  getSearchValues: (item: TItem) => readonly string[];
  renderLeading: (item: TItem) => ReactNode;
  renderTitle?: (item: TItem) => ReactNode;
  onRemove: (item: TItem) => void;
};

/** Case-insensitive substring match of a mutes list query against an entry. */
const matchesMuteSearch = (query: string, values: readonly string[]) => {
  const normalizedQuery = query.trim().toLocaleLowerCase("pl");

  return (
    !normalizedQuery ||
    values.some((value) =>
      value.toLocaleLowerCase("pl").includes(normalizedQuery),
    )
  );
};

/** One searchable list of muted entries, each with a remove button. */
export const MutedListTab = <TItem,>({
  controlId,
  title,
  searchPlaceholder,
  emptyLabel,
  noResultsLabel,
  isReady,
  items,
  getKey,
  getName,
  getSearchValues,
  renderLeading,
  renderTitle = getName,
  onRemove,
}: MutedListTabProps<TItem>) => {
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  const visibleItems = items
    .filter((item) => matchesMuteSearch(search, getSearchValues(item)))
    .toSorted((left, right) =>
      getName(left).localeCompare(getName(right), "pl"),
    );

  return (
    <SettingsTabLayout>
      <SettingsSection controlId={controlId} title={title}>
        <SettingsToolbar
          search={{
            value: search,
            placeholder: searchPlaceholder,
            onChange: (event) => setSearch(event.target.value),
            onClear: () => setSearch(""),
            clearLabel: t("settings.search.clear"),
          }}
        />
        {visibleItems.length === 0 ? (
          <SettingsEmptyState>
            {items.length === 0 ? emptyLabel : noResultsLabel}
          </SettingsEmptyState>
        ) : (
          <SettingsList>
            {visibleItems.map((item) => (
              <SettingsListRow
                key={getKey(item)}
                leading={renderLeading(item)}
                title={renderTitle(item)}
              >
                <IconButton
                  variant="quiet-destructive"
                  label={t("settings.mutes.removeLabel", {
                    name: getName(item),
                  })}
                  disabled={!isReady}
                  onClick={() => onRemove(item)}
                >
                  <Trash2 />
                </IconButton>
              </SettingsListRow>
            ))}
          </SettingsList>
        )}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
