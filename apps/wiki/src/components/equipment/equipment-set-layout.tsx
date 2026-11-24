import type { ReactNode } from "react";
import { Card } from "@lootlog/ui/components/card";
import { EquipmentSetPanel } from "./equipment-set-panel";

export function EquipmentSetLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[21rem_minmax(0,1fr)] lg:gap-8">
      <aside className="lg:sticky lg:top-[4.5rem]">
        <Card className="gap-0 p-4">
          <EquipmentSetPanel />
        </Card>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
