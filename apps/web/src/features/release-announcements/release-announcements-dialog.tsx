import ReactMarkdown from "react-markdown";
import { latestReleaseAnnouncement } from "./release-announcement";
import { Button, buttonVariants } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useTranslation } from "react-i18next";

interface ReleaseAnnouncementsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const changelogUrl = `https://docs.lootlog.pl/docs/changelog/${latestReleaseAnnouncement.slug}`;

export const ReleaseAnnouncementsDialog = ({
  open,
  onOpenChange,
}: ReleaseAnnouncementsDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:h-[min(90dvh,900px)] sm:max-h-[min(90dvh,900px)] sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="shrink-0 border-b border-border/70 px-4 py-4 pr-12 sm:px-6">
          <DialogTitle>{latestReleaseAnnouncement.title}</DialogTitle>
          <DialogDescription>
            {latestReleaseAnnouncement.description}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 px-4 py-5 text-sm leading-7 [&_a]:text-primary [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:m-0 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc sm:px-6">
            <ReactMarkdown>
              {latestReleaseAnnouncement.bodyMarkdown}
            </ReactMarkdown>
          </div>
        </ScrollArea>
        <DialogFooter className="shrink-0 border-t border-border/70 px-4 py-3 sm:px-6">
          <a
            className={buttonVariants({ variant: "outline" })}
            href={changelogUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t("releaseAnnouncements.openChangelog", "Otwórz changelog")}
          </a>
          <Button onClick={() => onOpenChange(false)}>
            {t("releaseAnnouncements.close", "Zamknij")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
