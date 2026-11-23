import { Badge } from "@lootlog/ui/components/badge";
import { text } from "@/lib/messages";

export function GrantBadge({ granted }: { granted: boolean }) {
  return granted ? (
    <Badge variant="ready">{text.aurasGranted}</Badge>
  ) : (
    <Badge variant="secondary">{text.aurasNotGranted}</Badge>
  );
}
