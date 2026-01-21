import { Button } from "@lootlog/ui/components/button";
import { X, Snowflake } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";
import { useTheme } from "@/hooks/context/use-theme";

const STORAGE_KEY = "lootlog:theme-announcement:rukia:dismissed";

export const ThemeAnnouncement = () => {
  const [isDismissed, setIsDismissed] = useLocalStorage(STORAGE_KEY, false);
  const { theme, setTheme } = useTheme();

  const isAlreadyRukia = theme === "rukia";

  // Hide only if user is already using Rukia theme
  // TODO: Re-enable isDismissed check after testing: if (isDismissed || isAlreadyRukia)
  if (isAlreadyRukia) {
    return null;
  }
  void isDismissed; // Suppress unused variable warning

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const handleSwitchTheme = () => {
    setTheme("rukia");
    setIsDismissed(true);
  };

  return (
    <div className="w-full relative z-[100] bg-gradient-to-r from-cyan-500 via-blue-400 to-purple-400 border-b border-cyan-300/30 shadow-lg shrink-0">
      <div className="w-full px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 shrink-0">
            <Snowflake className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
            <span className="text-white font-semibold text-sm whitespace-nowrap">
              Nowy motyw!
            </span>
            <span className="text-white/90 text-sm truncate">
              Wypróbuj Rukia - lodowy motyw inspirowany Hakka no Togame
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSwitchTheme}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm"
          >
            Wypróbuj
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
