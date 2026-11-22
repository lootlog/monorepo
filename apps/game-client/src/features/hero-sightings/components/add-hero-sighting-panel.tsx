import { useTranslation } from "react-i18next";
import { WindowOverlayPanel } from "@/components/draggable-window/window-overlay-panel";
import { AddHeroSightingForm } from "@/features/hero-sightings/components/add-hero-sighting-form";

type AddHeroSightingPanelProps = {
  world: string;
  onClose: () => void;
  className?: string;
};

export function AddHeroSightingPanel({
  world,
  onClose,
  className,
}: AddHeroSightingPanelProps) {
  const { t } = useTranslation("heroSightings");

  return (
    <WindowOverlayPanel
      title={t("addForm.title")}
      onClose={onClose}
      className={className}
    >
      <AddHeroSightingForm world={world} onClose={onClose} />
    </WindowOverlayPanel>
  );
}
