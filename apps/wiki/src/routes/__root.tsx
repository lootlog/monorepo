import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SharedTooltipProvider } from "@lootlog/ui/components/shared-tooltip-provider";
import { UiLabelsProvider } from "@lootlog/ui/components/ui-labels";
import { preventIosFocusZoom } from "@lootlog/ui/lib/ios-focus-zoom";
import { ItemComparisonProvider } from "@/components/comparison/item-comparison-provider";
import { EquipmentSetProvider } from "@/components/equipment/equipment-set-provider";
import { SetItemPickerProvider } from "@/components/equipment/set-item-picker-provider";
import { WikiError } from "@/components/layout/wiki-error";
import { WikiLayout } from "@/components/layout/wiki-layout";
import { WikiNotFound } from "@/components/layout/wiki-not-found";
import { QueryDevtools } from "@/components/query-devtools";
import { UserTheme } from "@/components/user-theme";
import { getRuntimeConfig } from "@/config/runtime-config";
import { getStoredTheme } from "@/config/theme-cookie";
import { WikiContext } from "@/contexts/wiki-context";
import { t } from "@/i18n/messages";
import { createLootlogAuthClient } from "@lootlog/client/auth-session";
import { configureWikiApiClients } from "@/lib/configure-api-clients";
import { getDocumentTheme } from "@/lib/document-theme";
import appCss from "@/styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: ({ loaderData }) => ({
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        { name: "theme-color", content: "#060607" },
        { name: "color-scheme", content: "dark" },
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
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        ...(loaderData?.documentTheme.fontStylesheet
          ? [
              {
                rel: "stylesheet",
                href: loaderData.documentTheme.fontStylesheet,
              },
            ]
          : []),
      ],
    }),
    loader: async () => {
      const [config, storedTheme] = await Promise.all([
        getRuntimeConfig(),
        getStoredTheme(),
      ]);

      return {
        config,
        storedTheme,
        documentTheme: getDocumentTheme(
          storedTheme.selection,
          storedTheme.customTheme,
        ),
      };
    },
    staleTime: Number.POSITIVE_INFINITY,
    shellComponent: RootDocument,
    notFoundComponent: WikiNotFound,
    errorComponent: WikiError,
  },
);

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
  const { config, storedTheme, documentTheme } = Route.useLoaderData();

  const [wikiContext] = useState(() => {
    configureWikiApiClients(config);

    return {
      config,
      authClient: createLootlogAuthClient(config.authServiceUrl),
    };
  });

  useEffect(preventIosFocusZoom, []);

  return (
    <html lang="pl" {...documentTheme.root} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere]">
        <WikiContext value={wikiContext}>
          <UiLabelsProvider labels={uiLabels}>
            <SharedTooltipProvider>
              <UserTheme
                storedSelection={storedTheme.selection}
                storedCustomTheme={storedTheme.customTheme}
              />
              <EquipmentSetProvider>
                <ItemComparisonProvider>
                  <SetItemPickerProvider>
                    <WikiLayout>{children}</WikiLayout>
                  </SetItemPickerProvider>
                </ItemComparisonProvider>
              </EquipmentSetProvider>
            </SharedTooltipProvider>
          </UiLabelsProvider>
          <QueryDevtools />
        </WikiContext>
        <Scripts />
      </body>
    </html>
  );
}
