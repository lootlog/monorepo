import { Badge } from "@lootlog/ui/components/badge";
import { text } from "@/lib/messages";

export function StatusBadge({ banned }: { banned: boolean }) {
  return banned ? (
    <Badge variant="destructive">{text.statusBanned}</Badge>
  ) : (
    <Badge variant="ready">{text.statusActive}</Badge>
  );
}
