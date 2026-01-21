import { useTheme } from "@/hooks/context/use-theme";
import { GlobalFrostOverlay } from "./rukia-frost";

export const RukiaFrostOverlay = () => {
  const { theme } = useTheme();
  const isRukiaTheme = theme === "rukia";

  if (!isRukiaTheme) return null;

  return <GlobalFrostOverlay />;
};
