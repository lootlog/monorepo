import { EmptyState } from "@/components/empty-state";
import { SettingsList } from "@/features/settings/components/shared/settings-list";
import { SettingsListRow } from "@/features/settings/components/shared/settings-list-row";
import { SettingsSection } from "@/features/settings/components/shared/settings-section";
import { SettingsTabLayout } from "@/features/settings/components/shared/settings-tab-layout";
import { SettingsToolbar } from "@/features/settings/components/shared/settings-toolbar";
import { IconButton } from "@/components/ui/icon-button";
import type { SettingsControlId } from "@/features/settings/settings-manifest";
import { Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { comparePolish } from "@lootlog/domain/locale";
import { normalizeSearchText } from "@lootlog/domain/text-fold";

type MutedListTabProps<TItem> = {
  controlId: SettingsControlId;
  title: string;
  searchPlaceholder: string;
  emptyLabel: string;
  noResultsLabel: string;
  isReady: boolean;
  items: readonly TItem[];
  getKey: (item: TItem) => string;
  getName: (item: TItem) => string;
  getSearchValues: (item: TItem) => readonly string[];
  renderLeading: (item: TItem) => ReactNode;
  renderTitle?: (item: TItem) => ReactNode;
  onRemove: (item: TItem) => void;
};

const matchesMuteSearch = (query: string, values: readonly string[]) => {
  const normalizedQuery = normalizeSearchText(query);

  return (
    !normalizedQuery ||
    values.some((value) => normalizeSearchText(value).includes(normalizedQuery))
  );
};

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
    .toSorted((left, right) => comparePolish(getName(left), getName(right)));

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
          <EmptyState
            description={items.length === 0 ? emptyLabel : noResultsLabel}
          />
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
