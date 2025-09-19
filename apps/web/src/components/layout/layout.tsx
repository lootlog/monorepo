import { CreateGuildModal } from "@/components/common/create-guild-modal/create-guild-modal";
import { InstallAddonModal } from "@/components/common/install-addon-modal/install-addon-modal";

import { Toaster } from "@lootlog/ui/components/sonner";

import { Outlet } from "react-router-dom";

export const Layout: React.FC = () => {
  // const style = {
  //   background:
  //     "linear-gradient(90deg,rgba(131, 58, 180, 0.31) 0%, rgba(253, 29, 29, 0.32) 50%, rgba(252, 176, 69, 0.3) 100%)",
  // };

  return (
    <div>
      <Outlet />
      <Toaster />
      <CreateGuildModal />
      <InstallAddonModal />
    </div>
  );
};
