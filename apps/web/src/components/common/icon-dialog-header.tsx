import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const TONE_CLASSES = {
  primary: { tile: "bg-primary/10", icon: "text-primary" },
  destructive: { tile: "bg-destructive/10", icon: "text-destructive" },
} as const;

interface IconDialogHeaderProps {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  tone?: keyof typeof TONE_CLASSES;
}

export const IconDialogHeader = ({
  icon: Icon,
  title,
  description,
  tone = "primary",
}: IconDialogHeaderProps) => {
  const toneClasses = TONE_CLASSES[tone];

  return (
    <DialogHeader className="shrink-0 border-b bg-muted/30 px-5 pt-5 pb-4">
      <div className="flex items-center gap-3 pr-4">
        <div className={cn("shrink-0 rounded-lg p-2", toneClasses.tile)}>
          <Icon aria-hidden="true" className={cn("size-4", toneClasses.icon)} />
        </div>
        <div className="min-w-0">
          <DialogTitle className="px-0 pt-0 text-base">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="mt-0.5 px-0 text-xs">
              {description}
            </DialogDescription>
          ) : null}
        </div>
      </div>
    </DialogHeader>
  );
};
