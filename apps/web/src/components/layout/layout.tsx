import { CreateGuildModal } from "@/components/common/create-guild-modal/create-guild-modal";
import { InstallAddonModal } from "@/components/common/install-addon-modal/install-addon-modal";
import { PageContainer } from "@/components/ui/page-container";
import { Toaster } from "@/components/ui/toaster";

import { ThemeProvider } from "next-themes";
import { Outlet } from "react-router-dom";

export const Layout: React.FC = () => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <PageContainer>
        <Outlet />
      </PageContainer>
      <Toaster />
      <CreateGuildModal />
      <InstallAddonModal />
    </ThemeProvider>
  );
};
