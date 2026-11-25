import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PortalPageHeader } from "@lootlog/ui/components/portal-page-header";
import { Tabs, TabsContent } from "@lootlog/ui/components/tabs";
import { EmptyNotice } from "@/components/common/empty-notice";
import { EquipmentSetEditor } from "@/components/equipment/equipment-set-editor";
import { SetItemPickerProvider } from "@/components/equipment/set-item-picker-provider";
import { FightAnalysis } from "@/components/fight/fight-analysis";
import { FightMatchup } from "@/components/fight/fight-matchup";
import { FightResults } from "@/components/fight/fight-results";
import { FightSampleBattle } from "@/components/fight/fight-sample-battle";
import { FightSide } from "@/components/fight/fight-side";
import { FightToolbar } from "@/components/fight/fight-toolbar";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useFighterProfile } from "@/hooks/use-fighter-profile";
import { useSharedStoredState } from "@/hooks/use-shared-stored-state";
import { t } from "@/i18n/messages";
import { wikiPageHead } from "@/lib/link-preview";
import {
  decodeEquipmentSet,
  EMPTY_EQUIPMENT_SET,
  encodeEquipmentSet,
} from "@/lib/equipment-set";
import {
  DEFAULT_SIMULATION_RUNS,
  runFight,
  sampleFight,
  type FightRun,
  type Fighters,
} from "@/lib/fight/fight-run";

export const Route = createFileRoute("/fight")({
  component: FightRoute,
  head: () =>
    wikiPageHead({
      path: "/fight",
      title: t("fightPage.title"),
      description: t("fightPage.description"),
      noindex: true,
    }),
});

const STORED_OPPONENT = {
  storageKey: "lootlog-wiki-fight-opponent",
  params: ["przeciwnik"],
  encode: encodeEquipmentSet,
  decode: decodeEquipmentSet,
  empty: EMPTY_EQUIPMENT_SET,
};

type FightTab = "analysis" | "mine" | "opponent";

type SimulatedFight = { fighters: Fighters; sets: string; run: FightRun };

const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;

const isFightTab = (value: unknown): value is FightTab =>
  value === "analysis" || value === "mine" || value === "opponent";

function FightRoute() {
  const { set: mySet } = useEquipmentSet();
  const [opponentSet, updateOpponent] = useSharedStoredState(STORED_OPPONENT);
  const mine = useFighterProfile(mySet);
  const opponent = useFighterProfile(opponentSet);
  const [tab, setTab] = useState<FightTab>("analysis");
  const [runs, setRuns] = useState(DEFAULT_SIMULATION_RUNS);
  const [progress, setProgress] = useState<number | null>(null);
  const [simulated, setSimulated] = useState<SimulatedFight | null>(null);
  const running = useRef<AbortController | null>(null);
  const sets = `${encodeEquipmentSet(mySet)}|${encodeEquipmentSet(opponentSet)}`;

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- stops the running simulation loop when the page unmounts
  useEffect(() => () => running.current?.abort(), []);

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

  const simulate = async () => {
    if (!fighters) return;

    running.current?.abort();
    const controller = new AbortController();
    running.current = controller;
    setTab("analysis");
    setProgress(0);

    const run = await runFight(fighters, {
      runs,
      seed: randomSeed(),
      signal: controller.signal,
      onProgress: setProgress,
    });

    if (running.current === controller) {
      running.current = null;
      setProgress(null);
    }

    if (run) setSimulated({ fighters, sets, run });
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

  const notes = [
    ...(simulated && simulated.sets !== sets ? [t("fightPage.stale")] : []),
    ...(ignoredSkills.length > 0
      ? [t("fightPage.ignoredSkills", { skills: ignoredSkills.join(", ") })]
      : []),
    t("fightPage.limits"),
  ];

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (isFightTab(value)) setTab(value);
      }}
      className="gap-0 pt-5 pb-10"
    >
      <div className="pb-4">
        <PortalPageHeader
          title={t("fightPage.title")}
          description={t("fightPage.description")}
        />
      </div>
      <FightToolbar
        runs={runs}
        onRunsChange={setRuns}
        progress={progress}
        canSimulate={fighters !== null}
        onSimulate={simulate}
        onCancel={() => running.current?.abort()}
      />
      <TabsContent value="analysis">
        <FightAnalysis
          matchup={
            <FightMatchup
              mine={mine.profile}
              opponent={opponent.profile}
              opponentSet={opponentSet}
              updateOpponent={updateOpponent}
              onEdit={setTab}
            />
          }
          results={
            simulated ? (
              <FightResults summary={simulated.run.summary} notes={notes} />
            ) : (
              <EmptyNotice>
                {fighters
                  ? t("fightPage.notSimulated")
                  : t("fightPage.missingProfession")}
              </EmptyNotice>
            )
          }
          sample={
            simulated ? (
              <FightSampleBattle
                sample={simulated.run.sample}
                onAnotherSample={showAnotherSample}
              />
            ) : null
          }
        />
      </TabsContent>
      <TabsContent value="mine" className="pt-4">
        <FightSide />
      </TabsContent>
      <TabsContent value="opponent" className="pt-4">
        <EquipmentSetEditor set={opponentSet} update={updateOpponent}>
          <SetItemPickerProvider>
            <FightSide />
          </SetItemPickerProvider>
        </EquipmentSetEditor>
      </TabsContent>
    </Tabs>
  );
}
