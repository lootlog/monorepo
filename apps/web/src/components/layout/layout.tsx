import { CreateGuildModal } from "@/components/common/create-guild-modal/create-guild-modal";
import { InstallAddonModal } from "@/components/common/install-addon-modal/install-addon-modal";
import { ThemeAnnouncement } from "@/components/common/theme-announcement";

import { Toaster } from "@lootlog/ui/components/sonner";

import { Outlet } from "@tanstack/react-router";

export const Layout: React.FC = () => {
  return (
    <div className="w-full h-dvh flex flex-col overflow-hidden">
      <ThemeAnnouncement />
      <div className="flex-1 min-h-0 h-full">
        <Outlet />
      </div>
      <Toaster />
      <CreateGuildModal />
      <InstallAddonModal />
    </div>
  );
};
