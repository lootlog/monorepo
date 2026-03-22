"use client";

import { Database, Sword, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@lootlog/ui/components/card";

export function ValueProposition() {
  const { t } = useTranslation();

  const registryItems = [
    t("landing.valueProposition.registry.item1"),
    t("landing.valueProposition.registry.item2"),
    t("landing.valueProposition.registry.item3"),
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-0">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            {t("landing.valueProposition.registry.title")}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("landing.valueProposition.registry.description")}
          </p>
          <ul className="space-y-2 pt-2">
            {registryItems.map((item) => (
              <li
                key={item}
                className="flex items-center text-sm text-foreground"
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="p-0">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Sword className="w-5 h-5 text-primary" />
            {t("landing.valueProposition.battles.title")}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("landing.valueProposition.battles.description")}
          </p>
          <div className="rounded-md border border-border bg-muted/20 p-4 mt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>
                {t("landing.valueProposition.battles.healingEfficiency")}
              </span>
              <span>84%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[84%] rounded-full" />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 mb-2">
              <span>
                {t("landing.valueProposition.battles.damageAbsorption")}
              </span>
              <span>92%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 w-[92%] rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
