import { useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@lootlog/ui/components/dialog";
import { SignInPrompt } from "@/components/common/sign-in-prompt";
import { useSession } from "@/hooks/use-session";
import { t } from "@/i18n/messages";
import { SavedSetsManager } from "./saved-sets-manager";

type SavedSetsButtonProps = {
  compact?: boolean;
  size?: "xs" | "sm";
};

export function SavedSetsButton({
  compact = false,
  size = "sm",
}: SavedSetsButtonProps) {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const label = t("savedSets.open");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={compact ? "ghost" : "outline"}
            size={compact ? "icon-sm" : size}
            aria-label={compact ? label : undefined}
            title={compact ? label : undefined}
          />
        }
      >
        <Bookmark aria-hidden="true" />
        {compact ? null : label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("savedSets.title")}</DialogTitle>
          <DialogDescription>{t("savedSets.description")}</DialogDescription>
        </DialogHeader>
        {session ? (
          <SavedSetsManager onClose={() => setOpen(false)} />
        ) : (
          <SignInPrompt reason={t("savedSets.signInRequired")} />
        )}
      </DialogContent>
    </Dialog>
  );
}
