import { Button } from "@lootlog/ui/components/button";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import { text } from "@/lib/messages";
import { useOrganizationAction } from "@/lib/use-organization-action";

export function OrganizationVanityUrl({
  guildId,
  vanityUrl,
}: {
  guildId: string;
  vanityUrl: string | null;
}) {
  const { run } = useOrganizationAction(guildId);

  if (vanityUrl === null)
    return <p className="text-sm text-muted-foreground">{text.noVanityUrl}</p>;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="rounded-control bg-secondary px-2 py-1 text-sm">
        {vanityUrl}
      </code>
      <ConfirmDialog
        title={text.vanityClearConfirmTitle(vanityUrl)}
        description={text.vanityClearConfirmDescription}
        confirmButtonLabel={text.vanityClear}
        cancelButtonLabel={text.cancel}
        onConfirm={() => run({ action: "clear-vanity-url" })}
        trigger={<Button variant="outline">{text.vanityClear}</Button>}
      />
    </div>
  );
}
