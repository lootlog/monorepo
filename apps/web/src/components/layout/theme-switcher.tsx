import { Button } from "@lootlog/ui/components/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/context/use-theme";

export function ThemeSwitcher() {
  const { colorMode, setColorMode } = useTheme();

  const toggleTheme = () => {
    if (colorMode === "dark") {
      setColorMode("light");
    } else {
      setColorMode("dark");
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
