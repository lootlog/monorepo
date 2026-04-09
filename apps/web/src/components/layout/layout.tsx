import { lazy, Suspense } from "react";

import { Toaster } from "@lootlog/ui/components/sonner";

import { Outlet } from "@tanstack/react-router";

const ThemeAnnouncement = lazy(() =>
  import("@/components/common/theme-announcement").then((module) => ({
    default: module.ThemeAnnouncement,
  })),
);
const CreateGuildModal = lazy(() =>
  import("@/components/common/create-guild-modal/create-guild-modal").then(
    (module) => ({
      default: module.CreateGuildModal,
    }),
  ),
);
const InstallAddonModal = lazy(() =>
  import("@/components/common/install-addon-modal/install-addon-modal").then(
    (module) => ({
      default: module.InstallAddonModal,
    }),
  ),
);

export const Layout: React.FC = () => {
  return (
    <div className="w-full h-dvh flex flex-col overflow-hidden">
      <Suspense fallback={null}>
        <ThemeAnnouncement />
      </Suspense>
      <div className="flex-1 min-h-0 h-full">
        <Outlet />
      </div>
      <Toaster />
      <Suspense fallback={null}>
        <CreateGuildModal />
        <InstallAddonModal />
      </Suspense>
    </div>
  );
};
