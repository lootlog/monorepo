import { useState } from "react";
import { Flag, LogIn } from "lucide-react";
import {
  type CatalogReportDtoOutputSubjectType,
  type CatalogReportsControllerGetOwnParams,
  useCatalogReportsControllerGetOwn,
} from "@lootlog/client/catalog";
import { useDiscordSignIn } from "@lootlog/client/auth-session";
import { Button } from "@lootlog/ui/components/button";
import { ButtonLoadingContent } from "@lootlog/ui/components/button-loading-content";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@lootlog/ui/components/dialog";
import { ReportForm } from "@/components/reports/report-form";
import { useWikiContext } from "@/contexts/wiki-context";
import { useSession } from "@/hooks/use-session";
import { useSignedInCatalogRequest } from "@/hooks/use-signed-in-catalog-request";
import { t } from "@/i18n/messages";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";

type ReportButtonProps = {
  subjectType: CatalogReportDtoOutputSubjectType;
  subjectId: number;
  /** The page's name, as its title shows it. */
  name: string;
};

/**
 * Lets a reader tell the moderators that a page shows something wrong. A
 * signed-in User sees their open report and may change or withdraw it.
 */
export function ReportButton({
  subjectType,
  subjectId,
  name,
}: ReportButtonProps) {
  const { authClient } = useWikiContext();
  const { session } = useSession();
  const request = useSignedInCatalogRequest();
  const signIn = useDiscordSignIn(authClient);
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
          <div className="flex flex-col gap-4 px-4 pb-4">
            <p className="text-sm text-muted-foreground">
              {t("reports.signInRequired")}
            </p>
            {signIn.hasError ? (
              <p role="alert" className="text-sm text-destructive">
                {t("userMenu.signInFailed")}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                disabled={signIn.isPending}
                onClick={() =>
                  void signIn.signIn({ callbackURL: window.location.href })
                }
              >
                <ButtonLoadingContent loading={signIn.isPending}>
                  <LogIn aria-hidden="true" />
                  {t("userMenu.signIn")}
                </ButtonLoadingContent>
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
