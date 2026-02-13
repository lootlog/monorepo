import type { Metadata } from "next";
import "@lootlog/ui/globals.css";
import type { ReactNode } from "react";
import { ThemeProvider } from "@lootlog/ui/components/next-theme-provider";
import { Toaster } from "@lootlog/ui/components/sonner";

export const metadata: Metadata = {
  title: "Lootlog Admin",
  description: "Administrative panel for managing users in Lootlog",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
        >
          {children}
          <Toaster closeButton richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
