import { Button } from "@lootlog/ui/components/button";
import { PageHeader } from "@/components/common/page-header";
import { SectionCardFooter } from "@/components/common/section-card/section-card-footer";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  actionPending?: boolean;
  mode: "reauth" | "retry";
  onAction: () => void;
};

export const AuthenticationRecovery = ({
  actionPending = false,
  mode,
  onAction,
}: Props) => {
  const { t } = useTranslation();
  const translationKey =
    mode === "reauth" ? "auth.reloginRequired" : "auth.unavailable";

  return (
    <div
      aria-live="polite"
      className="flex h-full min-h-64 items-center justify-center bg-background/50 px-3 py-3"
    >
      <PageHeader
        icon={ShieldAlert}
        className="w-full max-w-lg"
        title={t(`${translationKey}.title`)}
        description={t(`${translationKey}.description`)}
      >
        <SectionCardFooter>
          <Button
            className="w-full sm:w-auto"
            disabled={actionPending}
            onClick={onAction}
            size="sm"
          >
            {t(`${translationKey}.button`)}
          </Button>
        </SectionCardFooter>
      </PageHeader>
    </div>
  );
};
