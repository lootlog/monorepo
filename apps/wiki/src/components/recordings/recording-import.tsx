import { useState } from "react";
import {
  useCatalogFactsControllerPreview,
  useCatalogFactsControllerSubmit,
} from "@lootlog/client/catalog";
import { PRODUCT_LOCALE } from "@lootlog/domain/locale";
import { Button } from "@lootlog/ui/components/button";
import { ButtonLoadingContent } from "@lootlog/ui/components/button-loading-content";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { RecordingChanges } from "@/components/recordings/recording-changes";
import { RecordingCoverage } from "@/components/recordings/recording-coverage";
import { RecordingFactCounts } from "@/components/recordings/recording-fact-counts";
import { useSignedInCatalogRequest } from "@/hooks/use-signed-in-catalog-request";
import { t } from "@/i18n/messages";
import {
  countFactsByKind,
  readRecordingFile,
  type RecordingImport as Recording,
} from "@/lib/recording-import";

const recordedAt = new Intl.DateTimeFormat(PRODUCT_LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
});

type ReadState =
  | { status: "idle" }
  | { status: "reading" }
  | { status: "failed" }
  | { status: "read"; recording: Recording };

export function RecordingImport() {
  const request = useSignedInCatalogRequest();
  const [read, setRead] = useState<ReadState>({ status: "idle" });
  const preview = useCatalogFactsControllerPreview({ request });
  const submit = useCatalogFactsControllerSubmit({ request });

  const choose = async (file: File | undefined) => {
    preview.reset();
    submit.reset();

    if (!file) {
      setRead({ status: "idle" });

      return;
    }

    setRead({ status: "reading" });

    try {
      const recording = await readRecordingFile(file);

      setRead({ status: "read", recording });
      preview.mutate({ data: recording.request });
    } catch {
      setRead({ status: "failed" });
    }
  };

  const recording = read.status === "read" ? read.recording : undefined;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {t("moderation.recordings.description")}
      </p>

      <div className="flex max-w-md flex-col gap-2">
        <Label htmlFor="recording-file">
          {t("moderation.recordings.fileLabel")}
        </Label>
        <Input
          id="recording-file"
          type="file"
          accept="application/json,.json"
          aria-invalid={read.status === "failed" || undefined}
          aria-describedby={
            read.status === "failed" ? "recording-file-error" : undefined
          }
          onChange={(event) => void choose(event.target.files?.[0])}
        />
        {read.status === "failed" ? (
          <p
            id="recording-file-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {t("moderation.recordings.readError")}
          </p>
        ) : null}
      </div>

      {read.status === "reading" ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("moderation.recordings.reading")}
        </p>
      ) : null}

      {recording ? (
        <p className="text-sm tabular-nums">
          {t("moderation.recordings.summary", {
            file: recording.fileName,
            world: recording.extraction.world,
            startedAt: recordedAt.format(
              new Date(recording.extraction.startedAt),
            ),
            count: recording.extraction.facts.length,
          })}
        </p>
      ) : null}

      {recording && preview.isPending ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : null}

      {preview.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("moderation.recordings.previewError")}
        </p>
      ) : null}

      {recording && preview.data ? (
        <>
          {preview.data.alreadyImported ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t("moderation.recordings.alreadyImported")}
            </p>
          ) : null}

          <RecordingFactCounts counts={countFactsByKind(preview.data)} />
          <RecordingChanges
            preview={preview.data}
            facts={recording.request.facts}
          />
          <RecordingCoverage coverage={recording.extraction.coverage} />

          <div className="flex flex-col items-start gap-2 border-t border-border/50 pt-4">
            <Button
              type="button"
              disabled={
                preview.data.alreadyImported ||
                submit.isPending ||
                submit.isSuccess
              }
              onClick={() => submit.mutate({ data: recording.request })}
            >
              <ButtonLoadingContent loading={submit.isPending}>
                {t("moderation.recordings.submit")}
              </ButtonLoadingContent>
            </Button>
            {submit.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {t("moderation.recordings.submitError")}
              </p>
            ) : null}
            {submit.data ? (
              <p role="status" className="text-sm">
                {submit.data.alreadyImported
                  ? t("moderation.recordings.alreadyImported")
                  : t("moderation.recordings.submitted", {
                      created: submit.data.newVariants,
                      confirmed: submit.data.confirmedVariants,
                    })}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
