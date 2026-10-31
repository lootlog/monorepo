import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SharedTooltipProvider } from "@lootlog/ui/components/shared-tooltip-provider";
import { UiLabelsProvider } from "@lootlog/ui/components/ui-labels";
import { EquipmentPreviewProvider } from "@/components/equipment/equipment-preview-provider";
import { ItemComparisonProvider } from "@/components/comparison/item-comparison-provider";
import { EquipmentSetProvider } from "@/components/equipment/equipment-set-provider";
import { WikiLayout } from "@/components/layout/wiki-layout";
import QueryProvider from "@/components/query-provider";
import { UserTheme } from "@/components/user-theme";
import { getRuntimeConfig } from "@/config/runtime-config";
import { getStoredThemeSelection } from "@/config/theme-cookie";
import { WikiContext } from "@/contexts/wiki-context";
import { t } from "@/i18n/messages";
import { createWikiAuthClient } from "@/lib/auth-client";
import { configureWikiApiClients } from "@/lib/configure-api-clients";
import { getDocumentTheme } from "@/lib/document-theme";
import appCss from "@/styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: t("meta.title"),
      },
      {
        name: "description",
        content: t("meta.description"),
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  // Configuration and the stored theme hold for the whole visit.
  loader: async () => {
    const [config, storedThemeSelection] = await Promise.all([
      getRuntimeConfig(),
      getStoredThemeSelection(),
    ]);

    return { config, storedThemeSelection };
  },
  staleTime: Number.POSITIVE_INFINITY,
  shellComponent: RootDocument,
});

const uiLabels = {
  close: t("uiLabels.close"),
  sidebarTitle: t("uiLabels.sidebarTitle"),
  sidebarDescription: t("uiLabels.sidebarDescription"),
  toggleSidebar: t("uiLabels.toggleSidebar"),
  commandPaletteTitle: t("uiLabels.commandPaletteTitle"),
  commandPaletteDescription: t("uiLabels.commandPaletteDescription"),
  pagination: t("uiLabels.pagination"),
  previousPage: t("uiLabels.previousPage"),
  nextPage: t("uiLabels.nextPage"),
  previous: t("uiLabels.previous"),
  next: t("uiLabels.next"),
  morePages: t("uiLabels.morePages"),
};

function RootDocument({ children }: { children: React.ReactNode }) {
  const { config, storedThemeSelection } = Route.useLoaderData();
  const documentTheme = getDocumentTheme(storedThemeSelection);

  const [wikiContext] = useState(() => {
    configureWikiApiClients(config);

    return { config, authClient: createWikiAuthClient(config.authServiceUrl) };
  });

  return (
    // The browser applies the User's theme to the root after hydration.
    <html
      lang="pl"
      className={documentTheme.className}
      style={documentTheme.style}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere]">
        <WikiContext value={wikiContext}>
          <QueryProvider>
            <UiLabelsProvider labels={uiLabels}>
              <SharedTooltipProvider>
                <UserTheme storedSelection={storedThemeSelection} />
                <EquipmentPreviewProvider>
                  <EquipmentSetProvider>
                    <ItemComparisonProvider>
                      <WikiLayout>{children}</WikiLayout>
                    </ItemComparisonProvider>
                  </EquipmentSetProvider>
                </EquipmentPreviewProvider>
              </SharedTooltipProvider>
            </UiLabelsProvider>
          </QueryProvider>
        </WikiContext>
        <Scripts />
      </body>
    </html>
  );
}
