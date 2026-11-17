import { createFileRoute, redirect } from "@tanstack/react-router";

// The deployed site answers `/` with public/index.html, which works without
// JavaScript; this route covers navigation inside the app and the dev server.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/docs/$", params: { _splat: "" }, replace: true });
  },
});
