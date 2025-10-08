"use client";

import "@lootlog/ui/i18n/battle-i18n";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BATTLELOG_API_URL } from "@/src/config/battlelog";
import type {
  SharedBattleData,
  SharedRawBattleData,
} from "@lootlog/ui/types/battle";
import { BattlePageClient } from "./battle-page-client";

type BattleResponse = SharedBattleData & {
  createdAt: string;
  public: boolean;
};

type BattleRawResponse = {
  rawData: SharedRawBattleData;
  timestamp: string;
  battleId: string;
};

export default function BattlePage() {
  const searchParams = useSearchParams();
  const battleId = searchParams.get("id");

  const [battle, setBattle] = useState<BattleResponse | null>(null);
  const [battleRaw, setBattleRaw] = useState<BattleRawResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!battleId) {
      setError("Battle ID is required");
      setLoading(false);
      return;
    }

    const fetchBattleData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [battleRes, battleRawRes] = await Promise.all([
          fetch(`${BATTLELOG_API_URL}/battles/${battleId}`),
          fetch(`${BATTLELOG_API_URL}/battles/${battleId}/raw`),
        ]);

        if (!battleRes.ok || !battleRawRes.ok) {
          throw new Error("Failed to fetch battle data");
        }

        const [battleData, battleRawData] = await Promise.all([
          battleRes.json(),
          battleRawRes.json(),
        ]);

        setBattle(battleData);
        setBattleRaw(battleRawData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load battle");
      } finally {
        setLoading(false);
      }
    };

    fetchBattleData();
  }, [battleId]);

  // Scroll to top when battle finishes loading
  useEffect(() => {
    if (!loading && battle && battleRaw) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [loading, battle, battleRaw]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Ładowanie walki...</p>
        </div>
      </div>
    );
  }

  if (error || !battle || !battleRaw) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Nie znaleziono walki
          </h1>
          <p className="text-muted-foreground">
            {error || "The battle you're looking for doesn't exist."}
          </p>
        </div>
      </div>
    );
  }

  return <BattlePageClient battle={battle} battleRaw={battleRaw.rawData} />;
}
