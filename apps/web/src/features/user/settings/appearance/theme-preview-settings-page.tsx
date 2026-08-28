import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface ThemePreviewSettingsPageProps {
  children: ReactNode;
  descriptionKey: string;
  titleKey: string;
}

export const ThemePreviewSettingsPage = ({
  children,
  descriptionKey,
  titleKey,
}: ThemePreviewSettingsPageProps) => {
  const { t } = useTranslation();

  return (
    <div className="p-3 sm:p-4">
      <header className="mb-4 flex min-h-12 items-end justify-between gap-4 border-b border-border pb-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{t(titleKey)}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t(descriptionKey)}
          </p>
        </div>
      </header>
      {children}
    </div>
  );
};
