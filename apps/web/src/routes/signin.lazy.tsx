import { createLazyFileRoute } from "@tanstack/react-router";
import { SignIn } from "@/features/signin/signin";

export const Route = createLazyFileRoute("/signin")({
  component: SignIn,
});
