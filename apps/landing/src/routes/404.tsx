import { createFileRoute } from "@tanstack/react-router";
import { BlogNotFound } from "../components/blog/blog-not-found";
import { blogNotFoundHead } from "../config/blog";

export const Route = createFileRoute("/404")({
  head: () => blogNotFoundHead,
  component: BlogNotFound,
});
