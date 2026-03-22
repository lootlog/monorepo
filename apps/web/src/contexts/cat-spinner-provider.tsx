import type { FC, ReactNode } from "react";
import { SpinnerOverrideProvider } from "@lootlog/ui/components/spinner";
import { useTheme } from "@/hooks/context/use-theme";
import { CatPawSpinner } from "@/components/ui/cat-paw-spinner";

export const CatSpinnerProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { theme } = useTheme();
  const isCatTheme = theme.startsWith("cat-");

  return (
    <SpinnerOverrideProvider spinner={isCatTheme ? CatPawSpinner : null}>
      {children}
    </SpinnerOverrideProvider>
  );
};
