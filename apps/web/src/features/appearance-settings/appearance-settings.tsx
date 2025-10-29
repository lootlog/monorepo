import type { FC } from "react";
import { useTheme } from "@/hooks/context/use-theme";
import { ThemeCard } from "@lootlog/ui/components/theme-card";
import { Label } from "@lootlog/ui/components/label";

const themes = [
  {
    name: "default",
    title: "Default",
    description: "Domyślny",
    colors: ["#7C3AED", "#1F1F1F", "#3F3F46"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='defaultGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%237C3AED;stop-opacity:0.08' /%3E%3Cstop offset='50%25' style='stop-color:%234C1D95;stop-opacity:0.05' /%3E%3Cstop offset='100%25' style='stop-color:%232D1B69;stop-opacity:0.08' /%3E%3C/linearGradient%3E%3Cpattern id='stars' x='0' y='0' width='50' height='50' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='5' cy='5' r='1' fill='%23fff' opacity='0.05'/%3E%3Ccircle cx='25' cy='25' r='1.5' fill='%23fff' opacity='0.06'/%3E%3Ccircle cx='40' cy='10' r='0.8' fill='%23fff' opacity='0.05'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23defaultGrad)'/%3E%3Crect width='400' height='300' fill='url(%23stars)'/%3E%3C/svg%3E",
  },
  {
    name: "cyberpunk",
    title: "Cyberpunk",
    description: "Neon",
    colors: ["#FF1493", "#9D4EDD", "#00F0FF"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='cyberGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FF1493;stop-opacity:0.08' /%3E%3Cstop offset='50%25' style='stop-color:%239D4EDD;stop-opacity:0.06' /%3E%3Cstop offset='100%25' style='stop-color:%2300F0FF;stop-opacity:0.08' /%3E%3C/linearGradient%3E%3Cpattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%23FF1493' stroke-width='0.5' opacity='0.04'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23cyberGrad)'/%3E%3Crect width='400' height='300' fill='url(%23grid)'/%3E%3Ccircle cx='100' cy='80' r='30' fill='%23FF1493' opacity='0.03'/%3E%3Ccircle cx='300' cy='180' r='40' fill='%2300F0FF' opacity='0.03'/%3E%3Ccircle cx='200' cy='220' r='25' fill='%239D4EDD' opacity='0.04'/%3E%3C/svg%3E",
  },
  {
    name: "pastel",
    title: "Pastel",
    description: "Miękkie kolory",
    colors: ["#FFB3D9", "#E0BBE4", "#B4E7CE"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='pastelGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FFB3D9;stop-opacity:0.08' /%3E%3Cstop offset='50%25' style='stop-color:%23E0BBE4;stop-opacity:0.06' /%3E%3Cstop offset='100%25' style='stop-color:%23B4E7CE;stop-opacity:0.08' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23pastelGrad)'/%3E%3Ccircle cx='80' cy='60' r='50' fill='%23FFB3D9' opacity='0.04'/%3E%3Ccircle cx='320' cy='100' r='60' fill='%23E0BBE4' opacity='0.03'/%3E%3Ccircle cx='150' cy='200' r='70' fill='%23B4E7CE' opacity='0.04'/%3E%3Ccircle cx='280' cy='240' r='45' fill='%23FFB3D9' opacity='0.03'/%3E%3Cpath d='M 50 150 Q 100 100 150 150 T 250 150' stroke='%23E0BBE4' stroke-width='2' fill='none' opacity='0.04'/%3E%3Cpath d='M 200 80 Q 250 50 300 80' stroke='%23FFB3D9' stroke-width='2' fill='none' opacity='0.04'/%3E%3C/svg%3E",
  },
  {
    name: "fantasy",
    title: "Dark Fantasy",
    description: "Głębokie purpury i złoto",
    colors: ["#4A0E4E", "#8B0000", "#FFD700"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3CradialGradient id='fantasyGrad'%3E%3Cstop offset='0%25' style='stop-color:%234A0E4E;stop-opacity:0.09' /%3E%3Cstop offset='60%25' style='stop-color:%238B0000;stop-opacity:0.06' /%3E%3Cstop offset='100%25' style='stop-color:%23000000;stop-opacity:0.09' /%3E%3C/radialGradient%3E%3Cfilter id='glow'%3E%3CfeGaussianBlur stdDeviation='3' result='coloredBlur'/%3E%3CfeMerge%3E%3CfeMergeNode in='coloredBlur'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23fantasyGrad)'/%3E%3Cpolygon points='200,50 210,80 240,80 215,100 225,130 200,110 175,130 185,100 160,80 190,80' fill='%23FFD700' opacity='0.05' filter='url(%23glow)'/%3E%3Cpolygon points='100,150 105,165 120,165 110,175 115,190 100,180 85,190 90,175 80,165 95,165' fill='%23FFD700' opacity='0.04'/%3E%3Cpolygon points='320,180 325,195 340,195 330,205 335,220 320,210 305,220 310,205 300,195 315,195' fill='%23FFD700' opacity='0.04'/%3E%3Ccircle cx='200' cy='150' r='80' fill='%234A0E4E' opacity='0.04'/%3E%3C/svg%3E",
  },
  {
    name: "shonen",
    title: "Shonen",
    description: "Jasne i energetyczne",
    colors: ["#FF6B35", "#00A8E8", "#FFD23F"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='shonenGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FF6B35;stop-opacity:0.08' /%3E%3Cstop offset='50%25' style='stop-color:%2300A8E8;stop-opacity:0.06' /%3E%3Cstop offset='100%25' style='stop-color:%23FFD23F;stop-opacity:0.08' /%3E%3C/linearGradient%3E%3Cpattern id='energy' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 30 L 20 10 L 30 30 L 20 50 Z' fill='%23FFD23F' opacity='0.03'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23shonenGrad)'/%3E%3Crect width='400' height='300' fill='url(%23energy)'/%3E%3Cpath d='M 50 100 L 80 50 L 90 100 L 120 60 L 130 100' stroke='%23FFD23F' stroke-width='3' fill='none' opacity='0.05'/%3E%3Cpath d='M 250 180 L 280 130 L 290 180 L 320 140 L 330 180' stroke='%23FF6B35' stroke-width='3' fill='none' opacity='0.05'/%3E%3Ccircle cx='150' cy='150' r='40' fill='%2300A8E8' opacity='0.04'/%3E%3Ccircle cx='300' cy='80' r='35' fill='%23FF6B35' opacity='0.04'/%3E%3C/svg%3E",
  },
  {
    name: "onepiece",
    title: "One Piece - Zoro",
    description: "Łowca piratów",
    colors: ["#2D8659", "#7FD99A", "#1A5238"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='onepieceGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%232D8659;stop-opacity:0.08' /%3E%3Cstop offset='50%25' style='stop-color:%237FD99A;stop-opacity:0.06' /%3E%3Cstop offset='100%25' style='stop-color:%231A5238;stop-opacity:0.08' /%3E%3C/linearGradient%3E%3Cpattern id='swords' width='80' height='80' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 10 L 30 30 M 10 30 L 30 10' stroke='%232D8659' stroke-width='1' opacity='0.03'/%3E%3Cpath d='M 50 50 L 70 70 M 50 70 L 70 50' stroke='%237FD99A' stroke-width='1' opacity='0.04'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23onepieceGrad)'/%3E%3Crect width='400' height='300' fill='url(%23swords)'/%3E%3Ccircle cx='100' cy='100' r='40' fill='%232D8659' opacity='0.03'/%3E%3Ccircle cx='300' cy='200' r='50' fill='%237FD99A' opacity='0.04'/%3E%3Cpath d='M 150 150 L 170 100 L 175 150 L 180 100 L 185 150 L 200 80' stroke='%232D8659' stroke-width='2' fill='none' opacity='0.04'/%3E%3C/svg%3E",
  },
  {
    name: "anime",
    title: "Anime Kawaii",
    description: "Marin ❤️",
    colors: ["#F4C542", "#FF6B8A", "#FFB347"],
    backgroundImage:
      "https://a-static.besthdwallpaper.com/my-dress-up-darling-anime-marin-kitagawa-wallpaper-3554x1999-89573_53.jpg",
  },
  {
    name: "waguri",
    title: "Kaoruko Waguri",
    description: "Słodka i stylowa",
    colors: ["#FF69B4", "#8A2BE2", "#FFB6C1"],
    backgroundImage: "https://images7.alphacoders.com/139/1398235.png",
  },
  {
    name: "goth",
    title: "Gothic",
    description: "Mroczny i elegancki",
    colors: ["#1A1A1A", "#8B1A3D", "#6A0DAD"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='gothGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23000000;stop-opacity:0.12' /%3E%3Cstop offset='50%25' style='stop-color:%238B1A3D;stop-opacity:0.08' /%3E%3Cstop offset='100%25' style='stop-color:%236A0DAD;stop-opacity:0.10' /%3E%3C/linearGradient%3E%3Cpattern id='crosses' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 30 10 L 30 50 M 10 30 L 50 30' stroke='%238B1A3D' stroke-width='1.5' opacity='0.04'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23gothGrad)'/%3E%3Crect width='400' height='300' fill='url(%23crosses)'/%3E%3Ccircle cx='100' cy='100' r='35' fill='%236A0DAD' opacity='0.04'/%3E%3Ccircle cx='320' cy='220' r='45' fill='%238B1A3D' opacity='0.05'/%3E%3Cpath d='M 200 80 Q 220 100 200 120 Q 180 100 200 80' fill='%238B1A3D' opacity='0.03'/%3E%3Cpath d='M 280 150 L 290 140 L 300 150 L 290 160 Z' fill='%236A0DAD' opacity='0.04'/%3E%3C/svg%3E",
  },
  {
    name: "halloween",
    title: "Halloween",
    description: "Dynie, duchy i księżyc",
    colors: ["#FF8C1A", "#FFD9B3", "#1A1A1A"],
    backgroundImage:
      "https://www.baltana.com/files/wallpapers-4/Halloween-Background-Wallpaper-HD-14401.jpg",
  },
  {
    name: "realmadrid",
    title: "Real Madrid",
    description: "Calma y ganando",
    colors: ["#001F3F", "#FFFFFF", "#E5E5E5"],
    backgroundImage:
      "https://assets.goal.com/images/v3/blt05c464fcca9f63b6/Cristiano_Ronaldo_Real_Madrid_2012.jpg?auto=webp&format=pjpg&width=3840&quality=60",
  },
  {
    name: "realmadrid-3rd",
    title: "Real Madrid vs Juventus",
    description: "La Duodécima",
    colors: ["#7B3FF2", "#FFFFFF", "#E6D9FF"],
    backgroundImage:
      "https://assets-cms.thescore.com/uploads/image/file/401278/w768xh576_GettyImages-941534222.jpg",
  },
  {
    name: "barcelona",
    title: "FC Barcelona",
    description: "Blaugrana",
    colors: ["#A50044", "#004D98", "#5A0025"],
    backgroundImage:
      "https://s.france24.com/media/display/451ed2b8-eed6-11ea-afdd-005056bf87d6/w:1280/p:16x9/messi-1805.jpg",
  },
];

export const AppearanceSettings: FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8 p-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-xl font-bold">Wygląd</h1>
        <p className="text-muted-foreground">
          Dostosuj wygląd aplikacji według swoich preferencji.
        </p>
      </div>
      <div className="space-y-3">
        <Label className="text-lg font-semibold">Motyw</Label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {themes.map((themeOption) => (
            <ThemeCard
              key={themeOption.name}
              name={themeOption.name}
              title={themeOption.title}
              description={themeOption.description}
              colors={themeOption.colors}
              backgroundImage={themeOption.backgroundImage}
              isActive={theme === themeOption.name}
              onClick={() => setTheme(themeOption.name as typeof theme)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
