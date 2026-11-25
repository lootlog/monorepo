import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent } from "@lootlog/ui/components/tabs";
import { EmptyNotice } from "@/components/common/empty-notice";
import { EquipmentSetEditor } from "@/components/equipment/equipment-set-editor";
import { SetItemPickerProvider } from "@/components/equipment/set-item-picker-provider";
import { FightAnalysis } from "@/components/fight/fight-analysis";
import { FightCharacterStats } from "@/components/fight/fight-character-stats";
import { FightFighters } from "@/components/fight/fight-fighters";
import { FightList } from "@/components/fight/fight-list";
import { FightReplay } from "@/components/fight/fight-replay";
import { FightResults } from "@/components/fight/fight-results";
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
  DEFAULT_FIGHT_LIST_VIEW,
  listFights,
  type FightListView,
} from "@/lib/fight/fight-list";
import {
  DEFAULT_SIMULATION_RUNS,
  runFight,
  sampleFight,
  type FightSample,
  type Fighters,
} from "@/lib/fight/fight-run";
import type { FightSummary } from "@/lib/fight/fight-summary";

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

type SimulatedFight = {
  fighters: Fighters;
  sets: string;
  summary: FightSummary;
};

type Replay = { index: number; sample: FightSample };

const replayOf = (simulated: SimulatedFight, index: number): Replay | null => {
  const fight = simulated.summary.fights[index];

  return fight
    ? { index, sample: sampleFight(simulated.fighters, fight.seed) }
    : null;
};

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
  const [view, setView] = useState<FightListView>(DEFAULT_FIGHT_LIST_VIEW);
  const [replay, setReplay] = useState<Replay | null>(null);
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

    const summary = await runFight(fighters, {
      runs,
      seed: randomSeed(),
      signal: controller.signal,
      onProgress: setProgress,
    });

    if (running.current === controller) {
      running.current = null;
      setProgress(null);
    }

    if (!summary) return;

    const next = { fighters, sets, summary };

    setSimulated(next);
    setView(DEFAULT_FIGHT_LIST_VIEW);
    setReplay(replayOf(next, 0));
  };

  const order = simulated ? listFights(simulated.summary.fights, view) : [];
  const position = replay ? order.indexOf(replay.index) : -1;

  const selectFight = (index: number | undefined) => {
    if (simulated && index !== undefined) setReplay(replayOf(simulated, index));
  };

  const stepTo = (offset: number) => {
    const target = order[position + offset];

    return position >= 0 && target !== undefined
      ? () => selectFight(target)
      : null;
  };

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
      className="gap-0 pb-10"
    >
      <h1 className="sr-only">{t("fightPage.title")}</h1>
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
          fighters={
            <FightFighters
              opponentSet={opponentSet}
              updateOpponent={updateOpponent}
              onEdit={setTab}
            />
          }
          characterStats={
            <FightCharacterStats
              mine={mine.profile}
              opponent={opponent.profile}
            />
          }
          results={
            simulated ? (
              <FightResults
                summary={simulated.summary}
                notes={notes}
                selectedLengths={view.lengths}
                onSelectLengths={(lengths) =>
                  setView({
                    ...view,
                    lengths:
                      view.lengths?.from === lengths.from &&
                      view.lengths.to === lengths.to
                        ? null
                        : lengths,
                  })
                }
              />
            ) : (
              <EmptyNotice>
                {fighters
                  ? t("fightPage.notSimulated")
                  : t("fightPage.missingProfession")}
              </EmptyNotice>
            )
          }
          fights={
            simulated ? (
              <>
                <div className="flex h-[18rem] shrink-0 flex-col">
                  <FightList
                    fights={simulated.summary.fights}
                    order={order}
                    view={view}
                    onViewChange={setView}
                    selected={replay?.index ?? null}
                    onSelect={selectFight}
                  />
                </div>
                {replay ? (
                  <FightReplay
                    index={replay.index}
                    sample={replay.sample}
                    onPrevious={stepTo(-1)}
                    onNext={stepTo(1)}
                  />
                ) : null}
              </>
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
