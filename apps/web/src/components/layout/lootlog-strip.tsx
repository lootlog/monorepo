import { UserNavItem } from "@/components/layout/user-nav-item";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

const revealActiveTile = (strip: HTMLDivElement | null) => {
  if (!strip) return;

  const reveal = () => {
    const tile = strip.querySelector<HTMLElement>("[data-active]");

    if (!tile) return false;

    const offset =
      tile.getBoundingClientRect().left - strip.getBoundingClientRect().left;

    strip.scrollLeft += offset - (strip.clientWidth - tile.offsetWidth) / 2;

    return true;
  };

  if (reveal()) return;

  const observer = new MutationObserver(() => {
    if (reveal()) observer.disconnect();
  });

  observer.observe(strip, { childList: true, subtree: true });

  return () => observer.disconnect();
};

type LootlogStripProps = {
  children: ReactNode;
  onSelect?: () => void;
};

export const LootlogStrip = ({ children, onSelect }: LootlogStripProps) => {
  const { t } = useTranslation();

  return (
    <div
      ref={revealActiveTile}
      role="group"
      aria-label={t("layout.guildsSelector.ariaLabel")}
      className="flex gap-1 overflow-x-auto overscroll-x-contain border-b border-sidebar-border px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <UserNavItem variant="strip" onSelect={onSelect} />
      <span
        aria-hidden="true"
        className="mx-1 my-2 w-px shrink-0 self-stretch bg-sidebar-border"
      />
      {children}
    </div>
  );
};
