import { useDecorationTheme } from "@lootlog/ui/hooks/use-decoration-theme";
import { CatPawOverlay } from "@lootlog/ui/components/cat-paw-overlay";
import { RukiaFrostCardOverlay } from "@lootlog/ui/components/rukia-frost-card-overlay";
import { RiasMagicCardOverlay } from "@lootlog/ui/components/rias-magic-card-overlay";

export function ThemeDecoration() {
  const theme = useDecorationTheme();
  switch (theme) {
    case "cat":
      return <CatPawOverlay />;
    case "rukia":
      return <RukiaFrostCardOverlay />;
    case "rias":
      return <RiasMagicCardOverlay />;
    case null:
      return null;
  }
}
