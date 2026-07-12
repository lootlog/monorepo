import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  actionPending?: boolean;
  mode: "reauth" | "retry";
  onAction: () => void;
};

export const AuthenticationRecovery: React.FC<Props> = ({
  actionPending = false,
  mode,
  onAction,
}) => {
  const { t } = useTranslation();
  const translationKey =
    mode === "reauth" ? "auth.reloginRequired" : "auth.unavailable";

  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-background/50 px-3 py-3">
      <Card className="w-full max-w-lg gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-500/10 p-2.5 shadow-inner shadow-amber-500/10">
            <ShieldAlert className="size-4 text-amber-500" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold leading-tight">
                {t(`${translationKey}.title`)}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t(`${translationKey}.description`)}
              </p>
            </div>
            <Button
              className="w-full justify-center sm:w-auto"
              disabled={actionPending}
              onClick={onAction}
              size="sm"
            >
              {t(`${translationKey}.button`)}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
