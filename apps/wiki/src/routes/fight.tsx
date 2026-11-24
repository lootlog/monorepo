import { createFileRoute } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { useState } from "react";
import { Button } from "@lootlog/ui/components/button";
import { PortalPageHeader } from "@lootlog/ui/components/portal-page-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lootlog/ui/components/tabs";
import { EquipmentSetEditor } from "@/components/equipment/equipment-set-editor";
import { SetItemPickerProvider } from "@/components/equipment/set-item-picker-provider";
import { FightResults } from "@/components/fight/fight-results";
import { FightSide } from "@/components/fight/fight-side";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useFighterProfile } from "@/hooks/use-fighter-profile";
import { useSharedStoredState } from "@/hooks/use-shared-stored-state";
import { t } from "@/i18n/messages";
import {
  decodeEquipmentSet,
  EMPTY_EQUIPMENT_SET,
  encodeEquipmentSet,
} from "@/lib/equipment-set";
import {
  runFight,
  sampleFight,
  SIMULATED_FIGHTS,
  type FightRun,
} from "@/lib/fight/fight-run";
import type { FighterProfile } from "@/lib/fight/fighter-profile";

export const Route = createFileRoute("/fight")({
  component: FightRoute,
  head: () => ({
    meta: [{ title: `${t("fightPage.title")} | ${t("meta.title")}` }],
  }),
});

const STORED_OPPONENT = {
  storageKey: "lootlog-wiki-fight-opponent",
  params: ["przeciwnik"],
  encode: encodeEquipmentSet,
  decode: decodeEquipmentSet,
  empty: EMPTY_EQUIPMENT_SET,
};

type FightTab = "mine" | "opponent" | "fight";

type Fighters = {
  mine: FighterProfile;
  opponent: FighterProfile;
  names: { mine: string; opponent: string };
};

type SimulatedFight = { fighters: Fighters; sets: string; run: FightRun };

const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;

const isFightTab = (value: unknown): value is FightTab =>
  value === "mine" || value === "opponent" || value === "fight";

function FightRoute() {
  const { set: mySet } = useEquipmentSet();
  const [opponentSet, updateOpponent] = useSharedStoredState(STORED_OPPONENT);
  const mine = useFighterProfile(mySet);
  const opponent = useFighterProfile(opponentSet);
  const [tab, setTab] = useState<FightTab>("mine");
  const [simulated, setSimulated] = useState<SimulatedFight | null>(null);
  const sets = `${encodeEquipmentSet(mySet)}|${encodeEquipmentSet(opponentSet)}`;

  const fighters =
    mine.profile && opponent.profile && mine.isLoaded && opponent.isLoaded
      ? {
          mine: mine.profile,
          opponent: opponent.profile,
          names: {
            mine: t("fightPage.myName"),
            opponent: t("fightPage.opponentName"),
          },
        }
      : null;

  const simulate = () => {
    if (!fighters) return;

    setSimulated({ fighters, sets, run: runFight(fighters, randomSeed()) });
    setTab("fight");
  };

  const showAnotherSample = () =>
    setSimulated(
      (current) =>
        current && {
          ...current,
          run: {
            ...current.run,
            sample: sampleFight(current.fighters, randomSeed()),
          },
        },
    );

  const ignoredSkills = [
    ...(mine.profile?.ignoredActives ?? []),
    ...(opponent.profile?.ignoredActives ?? []),
  ];

  return (
    <div className="flex flex-col gap-6 py-6">
      <PortalPageHeader
        title={t("fightPage.title")}
        description={t("fightPage.description", { runs: SIMULATED_FIGHTS })}
        actions={
          <Button onClick={simulate} disabled={!fighters}>
            <Swords aria-hidden="true" />
            {simulated ? t("fightPage.resimulate") : t("fightPage.simulate")}
          </Button>
        }
      />
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (isFightTab(value)) setTab(value);
        }}
        className="gap-6"
      >
        <TabsList variant="underline" aria-label={t("fightPage.sections")}>
          <TabsTrigger value="mine">{t("fightPage.myTab")}</TabsTrigger>
          <TabsTrigger value="opponent">
            {t("fightPage.opponentTab")}
          </TabsTrigger>
          <TabsTrigger value="fight">{t("fightPage.fightTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="mine">
          <FightSide />
        </TabsContent>
        <TabsContent value="opponent">
          <EquipmentSetEditor set={opponentSet} update={updateOpponent}>
            <SetItemPickerProvider>
              <FightSide />
            </SetItemPickerProvider>
          </EquipmentSetEditor>
        </TabsContent>
        <TabsContent value="fight">
          {simulated ? (
            <FightResults
              run={simulated.run}
              stale={simulated.sets !== sets}
              ignoredSkills={ignoredSkills}
              onAnotherSample={showAnotherSample}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              {fighters
                ? t("fightPage.notSimulated")
                : t("fightPage.missingProfession")}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
