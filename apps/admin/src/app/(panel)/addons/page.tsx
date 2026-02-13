import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { Badge } from "@lootlog/ui/components/badge";

export default function AddonsPlaceholderPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Addon moderation
          <Badge variant="outline">Planned</Badge>
        </CardTitle>
        <CardDescription>
          Placeholder module prepared for future addon moderation workflows.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        This view is intentionally empty in MVP. RBAC and navigation are ready,
        while addon domain operations will be implemented in a dedicated
        iteration.
      </CardContent>
    </Card>
  );
}
