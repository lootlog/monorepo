"use client";

import { BarChart3, Coins, Ghost, Shield, Code } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@lootlog/ui/components/card";

interface FeaturePanelRowProps {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  delay: number;
}

function FeaturePanelRow({
  icon: Icon,
  title,
  description,
  badge,
  delay,
}: FeaturePanelRowProps) {
  return (
    <div
      className="group flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-accent/50 transition-colors animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-md transition-colors border border-border bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-primary/10 group-hover:border-primary/30">
          <Icon className="w-5 h-5 group-hover:text-primary transition-colors" />
        </div>
        <div>
          <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
            {title}
          </h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {badge && (
          <Badge
            variant="secondary"
            className="hidden md:inline-flex text-[10px] h-5 px-2 bg-muted border-border text-muted-foreground"
          >
            {badge}
          </Badge>
        )}
      </div>
    </div>
  );
}

export function FeaturesPanel() {
  const { t } = useTranslation();

  return (
    <Card className="p-0">
      <CardHeader className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
        <CardTitle className="text-sm">
          {t("landing.featuresPanel.title")}
        </CardTitle>
        <CardAction>
          <Badge
            variant="outline"
            className="text-[10px] h-6 px-2 border-primary/30 text-primary"
          >
            {t("landing.featuresPanel.activeCount")}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col">
          <FeaturePanelRow
            icon={BarChart3}
            title={t("landing.featuresPanel.battleAnalyzer.title")}
            description={t("landing.featuresPanel.battleAnalyzer.description")}
            badge="HOT"
            delay={50}
          />
          <FeaturePanelRow
            icon={Coins}
            title={t("landing.featuresPanel.autoLoot.title")}
            description={t("landing.featuresPanel.autoLoot.description")}
            badge="CORE"
            delay={150}
          />
          <FeaturePanelRow
            icon={Ghost}
            title={t("landing.featuresPanel.respawnTimer.title")}
            description={t("landing.featuresPanel.respawnTimer.description")}
            badge="KLAN"
            delay={250}
          />
          <FeaturePanelRow
            icon={Shield}
            title={t("landing.featuresPanel.clanVault.title")}
            description={t("landing.featuresPanel.clanVault.description")}
            delay={350}
          />
          <FeaturePanelRow
            icon={Code}
            title={t("landing.featuresPanel.openSource.title")}
            description={t("landing.featuresPanel.openSource.description")}
            badge="DEV"
            delay={450}
          />
        </div>
      </CardContent>
    </Card>
  );
}
