"use client";

import { useBattle } from "@/src/hooks/api/use-battle";
import { useSearchParams } from "next/navigation";
import { JSX } from "react";

export default function Home(): JSX.Element {
  const sp = useSearchParams();
  const id = sp.get("id");
  const { data } = useBattle({ battleId: id || undefined });

  if (id) {
    return <div>Battle ID: {id}</div>;
  }

  return <div>404 - Strona nie istnieje</div>;
}
