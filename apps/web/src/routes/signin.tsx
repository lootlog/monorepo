import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@/features/signin/signin";

export const Route = createFileRoute("/signin")({
  component: SignIn,
});
