import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SoundSettingsResponseDto } from "@lootlog/client/main";
import { setTestRuntimeGame } from "@/test/test-runtime-window";

const { mockUpdateSettings, mockPlaySoundTest, mockSoundSettings, testState } =
  vi.hoisted(() => ({
    mockUpdateSettings: vi.fn(),
    mockPlaySoundTest: vi.fn(),
    mockSoundSettings: {
      userId: "user-1",
      masterVolume: 0.8,
      notificationsVolume: 0.6,
      detectorVolume: 0.5,
      timersVolume: 0.4,
      notificationsConfig: {},
      detectorConfig: {},
      timersConfig: {},
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    } as SoundSettingsResponseDto,
    testState: {
      gameInterface: "ni" as "ni" | "si",
    },
  }));

vi.mock("@/components/settings/settings-section", () => ({
  SettingsSection: ({
    title,
    description,
    children,
  }: {
    title?: string;
    description?: string;
    children: ReactNode;
  }) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
}));

vi.mock("@/components/settings/settings-tab-layout", () => ({
  SettingsTabLayout: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: ReactNode;
  }) => (
    <section>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
}));

vi.mock("@/hooks/api/use-sound-settings", () => ({
  useSoundSettings: () => ({
    data: mockSoundSettings,
    isLoading: false,
  }),
  useUpdateSoundSettings: () => ({
    mutate: mockUpdateSettings,
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-sound-playback", () => ({
  useSoundPlayback: () => ({
    playSoundTest: mockPlaySoundTest,
  }),
}));

vi.mock("./category-accordion-item", () => ({
  CategoryAccordionItem: ({
    label,
    description,
  }: {
    label: string;
    description?: string;
  }) => (
    <div>
      <span>{label}</span>
      {description ? <span>{description}</span> : null}
    </div>
  ),
}));

vi.mock("./master-volume-control", () => ({
  MasterVolumeControl: () => <div>master-volume-control</div>,
}));

import { SoundsSettingsTab } from "./sounds-settings-tab";

describe("SoundsSettingsTab", () => {
  beforeEach(() => {
    mockUpdateSettings.mockReset();
    mockPlaySoundTest.mockReset();
    testState.gameInterface = "ni";
    setTestRuntimeGame({ interface: "ni" });
  });

  it("renders translated settings copy instead of raw settings keys", () => {
    render(<SoundsSettingsTab />);

    expect(
      screen.getByRole("heading", { name: "Ustawienia dźwięków" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Skonfiguruj dźwięki dla różnych funkcji."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Kategorie dźwięków" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Powiadomienia")).toBeInTheDocument();
    expect(screen.getByText("Wykrywacz")).toBeInTheDocument();
    expect(screen.getByText("Timery")).toBeInTheDocument();
    expect(screen.queryByText("settings.sounds.title")).not.toBeInTheDocument();
    expect(
      screen.queryByText("settings.sounds.categories.notifications.label"),
    ).not.toBeInTheDocument();
  });

  it("hides map ping sound settings on the old interface", () => {
    testState.gameInterface = "si";
    setTestRuntimeGame({ interface: "si" });
    render(<SoundsSettingsTab />);

    expect(
      screen.queryByRole("heading", { name: "Pingi na mapie" }),
    ).not.toBeInTheDocument();
  });

  it("shows map ping sound settings on the new interface", () => {
    render(<SoundsSettingsTab />);

    expect(
      screen.getByRole("heading", { name: "Pingi na mapie" }),
    ).toBeInTheDocument();
  });
});
