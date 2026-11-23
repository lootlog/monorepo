import { Link } from "@tanstack/react-router";
import { PortalNotFound } from "@lootlog/ui/components/portal-not-found";
import { text } from "@/lib/messages";

export function AdminNotFound() {
  return (
    <PortalNotFound
      home={<Link to="/" />}
      labels={{
        title: text.notFoundTitle,
        description: text.notFoundDescription,
        backHome: text.backHome,
      }}
    />
  );
}
