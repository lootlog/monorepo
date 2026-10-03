import { Button } from "@lootlog/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ThemeInteractiveFrame } from "@/themes";

export const TopBarBackButton = ({ to }: { to: string }) => {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ThemeInteractiveFrame isHovered={isHovered} isActive={false}>
        <Button
          aria-label={t("common.actions.back")}
          variant="ghost"
          size="icon"
          nativeButton={false}
          role="link"
          render={<Link to={to} />}
          className="size-8 rounded-full hover:bg-muted/50"
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
      </ThemeInteractiveFrame>
    </div>
  );
};
