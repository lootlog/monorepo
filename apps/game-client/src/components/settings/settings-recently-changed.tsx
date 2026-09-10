import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { useRecentlyChangedStore } from "@/features/settings/recently-changed.store";
import {
  getControlLocation,
  SETTINGS_MANIFEST,
} from "@/features/settings/settings-manifest";
import { useSettingsUiStore } from "@/features/settings/settings-ui.store";
import { ChevronRight, History } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

/** Start view: the controls the player changed most recently. */
export const SettingsRecentlyChanged: FC = () => {
  const { t } = useTranslation();
  const entries = useRecentlyChangedStore((state) => state.entries);
  const clear = useRecentlyChangedStore((state) => state.clear);
  const openControl = useSettingsUiStore((state) => state.openControl);

  const items = entries.flatMap((entry) => {
    const location = getControlLocation(entry.controlId);

    if (!location) return [];

    const domain = SETTINGS_MANIFEST.find(
      (item) => item.id === location.domain,
    );

    const subsection = domain?.subsections.find(
      (item) => item.id === location.subsection,
    );

    if (!domain || !subsection) return [];

    return [
      {
        controlId: entry.controlId,
        label: t(location.control.labelKey),
        path: `${t(domain.labelKey)} › ${t(subsection.labelKey)}`,
      },
    ];
  });

  return (
    <SettingsSection
      title={
        <span className="ll:inline-flex ll:items-center ll:gap-1">
          <History className="ll:size-3" aria-hidden="true" />
          {t("settings.recent.title")}
        </span>
      }
      description={t("settings.recent.description")}
      actions={
        <Button
          variant="ghost"
          onClick={clear}
          className="ll:h-auto ll:px-1.5 ll:py-0.5 ll:text-[11px] ll:leading-none ll:text-muted-foreground ll:transition-[color,background-color,scale] ll:duration-150 ll:ease-out ll:hover:text-foreground ll:active:scale-[0.96]"
        >
          {t("settings.recent.clear")}
        </Button>
      }
    >
      <ul className="ll:m-0 ll:flex ll:list-none ll:flex-col ll:p-0">
        {items.map((item) => (
          <li key={item.controlId}>
            <button
              type="button"
              onClick={() => openControl(item.controlId)}
              className="ll-custom-cursor-pointer ll:flex ll:w-full ll:min-h-[var(--ll-settings-control-height)] ll:items-center ll:gap-2 ll:rounded-sm ll:border-0 ll:bg-transparent ll:ps-2 ll:pe-1.5 ll:py-[var(--ll-settings-space-sm)] ll:text-start ll:hover:bg-white/5 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:focus-visible:-outline-offset-2"
            >
              <span className="ll:min-w-0 ll:flex-1">
                <span className="ll:block ll:truncate ll:text-[length:var(--ll-settings-font-size)] ll:leading-[var(--ll-settings-line-height)] ll:text-gray-100">
                  {item.label}
                </span>
                <span className="ll:block ll:truncate ll:text-[length:var(--ll-settings-meta-font-size)] ll:leading-[var(--ll-settings-meta-line-height)] ll:text-muted-foreground">
                  {item.path}
                </span>
              </span>
              <ChevronRight
                className="ll:size-3.5 ll:shrink-0 ll:text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
};
