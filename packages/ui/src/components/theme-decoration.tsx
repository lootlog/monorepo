import { useDecorationTheme } from "@lootlog/ui/hooks/use-decoration-theme";
import { CatPawOverlay } from "@lootlog/ui/components/cat-paw-overlay";

/* Rias and Rukia decorate cards from CSS pseudo-elements; only the cat themes need DOM. */
export function ThemeDecoration() {
  const theme = useDecorationTheme();

  switch (theme) {
    case "cat":
      return <CatPawOverlay />;
    case null:
      return null;
  }
}
