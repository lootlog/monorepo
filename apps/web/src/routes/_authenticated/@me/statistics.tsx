import { createFileRoute } from "@tanstack/react-router";
import { Statistics } from "@/features/user/statistics/statistics";
import { parseStatisticsSearch } from "@/features/user/statistics/statistics-search";

export const Route = createFileRoute("/_authenticated/@me/statistics")({
  validateSearch: parseStatisticsSearch,
  component: Statistics,
});
