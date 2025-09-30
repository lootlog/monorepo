import { CreateGuildModal } from "@/components/common/create-guild-modal/create-guild-modal";
import { InstallAddonModal } from "@/components/common/install-addon-modal/install-addon-modal";

import { Toaster } from "@lootlog/ui/components/sonner";

import { Outlet } from "react-router-dom";

export const Layout: React.FC = () => {
  return (
    <div className="w-full">
      <Outlet />
      <Toaster />
      <CreateGuildModal />
      <InstallAddonModal />
    </div>
  );
};
