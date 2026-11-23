import { Badge } from "@lootlog/ui/components/badge";
import { useChangeCount } from "@lootlog/ui/hooks/use-change-count";
import { text } from "@/lib/messages";

export function GrantBadge({ granted }: { granted: boolean }) {
  const changes = useChangeCount(granted);

  return granted ? (
    <Badge
      key={changes}
      variant="ready"
      className={
        changes > 0 ? "animate-pop-in motion-reduce:animate-none" : undefined
      }
    >
      {text.aurasGranted}
    </Badge>
  ) : (
    <Badge variant="secondary">{text.aurasNotGranted}</Badge>
  );
}
