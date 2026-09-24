import { LogIn } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useWindowsStore } from "@/store/windows.store";

/** Keeps at least this much of the launcher on screen after a viewport shrink. */
const MIN_VISIBLE_PX = 48;

type ExtensionLoginLauncherProps = {
  onOpen: () => void;
};

/**
 * The way back to a dismissed login window. It sits where the player keeps the
 * quick access bar, which takes that place once the player is signed in, and
 * shares that window's frame so it reads as the same Lootlog entry point.
 */
export const ExtensionLoginLauncher: FC<ExtensionLoginLauncherProps> = ({
  onOpen,
}) => {
  const { t } = useTranslation("common");
  const position = useWindowsStore((state) => state["quick-access"].position);

  return (
    <button
      type="button"
      className="ll-custom-cursor-pointer ll:pointer-events-auto ll:absolute ll:inline-flex ll:h-8 ll:items-center ll:gap-1.5 ll:rounded-lg ll:border ll:border-white/50 ll:bg-black/75 ll:px-2.5 ll:text-xs ll:text-white ll:shadow-[2px_2px_3px_3px_rgba(12,13,13,0.4)] ll:transition-colors ll:motion-reduce:transition-none ll:hover:bg-black ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
      style={{
        left: Math.max(
          0,
          Math.min(position.x, window.innerWidth - MIN_VISIBLE_PX),
        ),
        top: Math.max(
          0,
          Math.min(position.y, window.innerHeight - MIN_VISIBLE_PX),
        ),
      }}
      onClick={(event) => {
        // The overlay sits above Margonem; a click here must not reach the game.
        event.stopPropagation();
        onOpen();
      }}
    >
      <LogIn size={14} aria-hidden="true" />
      {t("auth.openLogin")}
    </button>
  );
};
