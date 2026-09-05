import { lazy, Suspense, useState } from "react";
import { useGlobalContext } from "@/hooks/context/use-global-context";

const CreateGuildModal = lazy(() =>
  import("./create-guild-modal/create-guild-modal").then((module) => ({
    default: module.CreateGuildModal,
  })),
);
const InstallAddonModal = lazy(() =>
  import("./install-addon-modal/install-addon-modal").then((module) => ({
    default: module.InstallAddonModal,
  })),
);

export const GlobalModals = () => {
  const { createGuildModal, installAddonModal } = useGlobalContext();
  const [hasOpenedCreate, setHasOpenedCreate] = useState(false);
  const [hasOpenedInstall, setHasOpenedInstall] = useState(false);

  if (createGuildModal.state.isOpen && !hasOpenedCreate) {
    setHasOpenedCreate(true);
  }
  if (installAddonModal.state.isOpen && !hasOpenedInstall) {
    setHasOpenedInstall(true);
  }

  return (
    <>
      <Suspense fallback={null}>
        {hasOpenedCreate && <CreateGuildModal />}
      </Suspense>
      <Suspense fallback={null}>
        {hasOpenedInstall && <InstallAddonModal />}
      </Suspense>
    </>
  );
};
