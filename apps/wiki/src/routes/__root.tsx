import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { SharedTooltipProvider } from "@lootlog/ui/components/shared-tooltip-provider";
import Footer from "@/components/footer";
import Header from "@/components/header";
import QueryProvider from "@/components/query-provider";
import { t } from "@/i18n/messages";
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
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className="dark" style={{ colorScheme: "dark" }}>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        <QueryProvider>
          <SharedTooltipProvider>
            <Header />
            {children}
            <Footer />
          </SharedTooltipProvider>
        </QueryProvider>
        <Scripts />
      </body>
    </html>
  );
}
