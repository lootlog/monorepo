import { PUBLIC_SITE_ORIGINS } from "@lootlog/domain/public-sites";
import { createDocsSite } from "@lootlog/ui/lib/docs-markdown";
import { source } from "@/lib/source";

export const docsSite = createDocsSite({
  source,
  origin: PUBLIC_SITE_ORIGINS.docs,
  llms: {
    title: "Dokumentacja Lootlog",
    summary:
      "Lootlog to darmowy, otwarty dodatek do gry Margonem z panelem webowym i botem Discord: zapisuje timery respów, łupy, zabicia i walki graczy oraz udostępnia je ich grupie.",
    notes: `
Dokumentacja dla graczy jest po polsku. Każda strona ma wersję Markdown pod tym samym adresem z końcówką \`.md\`; cała dokumentacja w jednym pliku jest pod ${PUBLIC_SITE_ORIGINS.docs}/llms-full.txt.

Pojęcia: „Lootlog” w treści oznacza też grupę graczy, która korzysta z Lootloga razem. Każdy taki Lootlog jest przypięty do jednego serwera Discord, a dostęp do niego daje członkostwo na tym serwerze. Klan to wyłącznie klan w grze Margonem; jeden Lootlog może obejmować kilka klanów i graczy bez klanu. Logowanie odbywa się wyłącznie przez Discord.

Integracje, API i SDK opisuje portal dla programistów (po angielsku): ${PUBLIC_SITE_ORIGINS.developer}/llms.txt
`,
    firstSection: "Start",
    otherPagesSection: "Pozostałe strony",
  },
});
