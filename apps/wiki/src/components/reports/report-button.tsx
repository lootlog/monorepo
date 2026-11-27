import { useState } from "react";
import { Flag } from "lucide-react";
import {
  type CatalogReportDtoOutputSubjectType,
  type CatalogReportsControllerGetOwnParams,
  useCatalogReportsControllerGetOwn,
} from "@lootlog/client/catalog";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@lootlog/ui/components/dialog";
import { ReportForm } from "@/components/reports/report-form";
import { SignInPrompt } from "@/components/common/sign-in-prompt";
import { useSession } from "@/hooks/use-session";
import { useSignedInCatalogRequest } from "@/hooks/use-signed-in-catalog-request";
import { t } from "@/i18n/messages";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";

type ReportButtonProps = {
  subjectType: CatalogReportDtoOutputSubjectType;
  subjectId: number;
  name: string;
};

export function ReportButton({
  subjectType,
  subjectId,
  name,
}: ReportButtonProps) {
  const { session } = useSession();
  const request = useSignedInCatalogRequest();
  const [open, setOpen] = useState(false);

  const subject = {
    subjectType,
    gameVersion: WIKI_GAME_VERSION,
    subjectId,
  } satisfies CatalogReportsControllerGetOwnParams;

  const { data } = useCatalogReportsControllerGetOwn(subject, {
    query: { enabled: session !== null },
    request,
  });

  const report = session ? (data?.report ?? null) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        <Flag aria-hidden="true" />
        {report ? t("reports.reported") : t("reports.report")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("reports.title")}</DialogTitle>
          <DialogDescription>
            {t("reports.description", { name })}
          </DialogDescription>
        </DialogHeader>
        {session ? (
          <ReportForm
            key={report?.id ?? "new"}
            subject={subject}
            report={report}
            onDone={() => setOpen(false)}
          />
        ) : (
          <SignInPrompt reason={t("reports.signInRequired")} />
        )}
      </DialogContent>
    </Dialog>
  );
}
