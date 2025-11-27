import { BarChart3, Coins, Ghost, Shield, Code } from "lucide-react";
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
  return (
    <Card className="p-0">
      <CardHeader className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
        <CardTitle className="text-sm">Aktywne Moduły</CardTitle>
        <CardAction>
          <Badge
            variant="outline"
            className="text-[10px] h-6 px-2 border-primary/30 text-primary"
          >
            5 aktywnych
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col">
          <FeaturePanelRow
            icon={BarChart3}
            title="Analizator Walk"
            description="Szczegółowe statystyki z każdej tury."
            badge="HOT"
            delay={50}
          />
          <FeaturePanelRow
            icon={Coins}
            title="Auto-Loot"
            description="Baza dropów legendarnych i heroicznych."
            badge="CORE"
            delay={150}
          />
          <FeaturePanelRow
            icon={Ghost}
            title="Zegar Respów"
            description="Synchronizowane timery E2 i Tytanów."
            badge="KLAN"
            delay={250}
          />
          <FeaturePanelRow
            icon={Shield}
            title="Skarbiec Klanowy"
            description="Transparentny podział łupów w grupie."
            delay={350}
          />
          <FeaturePanelRow
            icon={Code}
            title="Open Source"
            description="Kod dostępny na GitHub. Zero wirusów."
            badge="DEV"
            delay={450}
          />
        </div>
      </CardContent>
    </Card>
  );
}
