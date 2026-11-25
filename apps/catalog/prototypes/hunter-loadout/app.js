const form = document.querySelector("#form");

const submit = document.querySelector("#submit");

const goal = document.querySelector("#goal");

const opponentField = document.querySelector("#opponent-field");

const result = document.querySelector("#result");

let lastResponse = null;

let selectedBuild = 0;

const number = (value, digits = 0) =>
  value.toLocaleString("pl-PL", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

const RARITY_LABELS = {
  legendary: "legendarny",
  upgraded: "ulepszony",
  heroic: "heroiczny",
  unique: "unikatowy",
  common: "zwykły",
};

const rarityClass = (rarity) => `rarity-${rarity || "common"}`;

const itemMeta = (item) =>
  [
    `<span class="${rarityClass(item.rarity)}">${RARITY_LABELS[item.rarity || "common"] ?? escape(item.rarity)}</span>`,
    `poz. ${item.lvl}${item.elastic ? " (elastyczny)" : ""}`,
    item.legendaryBonus ? `bonus: ${escape(item.legendaryBonus)}` : "",
    item.event ? "event" : "",
  ]
    .filter(Boolean)
    .join(" · ");

const itemSources = (item) =>
  item.sources.length
    ? `Drop: ${item.sources.map(escape).join(", ")}`
    : "Brak znanego dropu";

const renderSlot = (slot) => {
  const item = slot.item;

  if (!item) {
    return `<article class="slot"><div class="slot-label">${escape(slot.label)}</div><div class="item-meta">Brak przedmiotów spełniających filtry</div></article>`;
  }

  const stats = item.stats
    .map(
      (stat) =>
        `<span class="stat${stat.modelled ? "" : " ignored"}" title="${stat.modelled ? "liczone w modelu" : "pomijane przez model"}">${escape(stat.label)} ${escape(stat.value)}</span>`,
    )
    .join("");

  const alternatives = slot.alternatives
    .map(
      ({ item: alt, loss }) =>
        `<div class="alt"><span><span class="${rarityClass(alt.rarity)}">${escape(alt.name)}</span> <span class="item-meta">poz. ${alt.lvl}</span></span><span class="loss">−${number(loss * 100, 1)}%</span></div>`,
    )
    .join("");

  return `<article class="slot">
    <div class="slot-label"><span>${escape(slot.label)}</span><span>${slot.candidates} kandydatów</span></div>
    <div class="item-head">
      <div class="icon"><img src="${escape(item.icon)}" alt="" loading="lazy" /></div>
      <div>
        <div class="item-name ${rarityClass(item.rarity)}">${escape(item.name)}</div>
        <div class="item-meta">${itemMeta(item)}</div>
        <div class="item-sources">${itemSources(item)}</div>
      </div>
    </div>
    <div class="stats">${stats}</div>
    <details>
      <summary>Najbliższe alternatywy</summary>
      ${alternatives || "<div class='item-meta'>Brak</div>"}
    </details>
  </article>`;
};

const kpi = (label, value, compare) =>
  `<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div>${compare ? `<div class="compare">${compare}</div>` : ""}</div>`;

const renderStatValues = (values) => {
  const max = Math.max(...values.map((value) => value.gain), 0.0001);

  return `<div class="value-list">${values
    .map(
      (value) => `<div class="value-row">
        <span>${escape(value.label)}</span>
        <span class="amount">${escape(value.amount)}</span>
        <span class="bar" aria-hidden="true"><span style="width:${Math.max(0, (value.gain / max) * 100)}%"></span></span>
        <span class="gain ${value.gain >= 0 ? "" : "bad"}">${value.gain >= 0 ? "+" : ""}${number(value.gain * 100, 1)}%</span>
      </div>`,
    )
    .join("")}</div>`;
};

const renderSkills = (build) => {
  const counted = (skill) => skill.modelled || skill.simulated;
  const modelled = build.skills.filter(counted);
  const filler = build.skills.filter((skill) => !counted(skill));
  const fillerPoints = filler.reduce((total, skill) => total + skill.rank, 0);

  return `<div class="skill-list">${modelled
    .map(
      (skill) =>
        `<span class="skill" title="${escape(skill.effects)}">${escape(skill.name)} <b>${skill.rank}/${skill.maxRank}</b>${skill.active ? " · aktywna" : ""}</span>`,
    )
    .join("")}</div>
    <p class="section-lead" style="margin-top:8px">${fillerPoints} z ${build.skillPoints} punktów idzie w umiejętności, których ani model, ani symulacja nie liczą, tylko po to, żeby odblokować wyższe progi drzewka: ${filler.map((skill) => escape(skill.name)).join(", ")}.</p>`;
};

const renderOpponents = (build) => {
  const rows = build.perOpponent
    .map(
      (entry) => `<tr>
        <td>${escape(entry.profession)}</td>
        <td>${number(entry.myTimeToKill, 2)}</td>
        <td>${number(entry.theirTimeToKill, 2)}</td>
        <td class="${entry.theirTimeToKill >= entry.myTimeToKill ? "good" : "bad"}">${number(entry.theirTimeToKill / entry.myTimeToKill, 2)}×</td>
        <td>${number(entry.poisonShare * 100, 0)}%</td>
      </tr>`,
    )
    .join("");

  return `<div class="table-wrap"><table class="compare">
    <thead><tr><th>Przeciwnik</th><th>Ty zabijasz w</th><th>On zabija cię w</th><th>Przewaga</th><th>Udział trucizny</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
};

const percent = (value, digits = 0) => `${number(value * 100, digits)}%`;

const winClass = (rate) => (rate >= 0.5 ? "good" : "bad");

const averageSkillUses = (duels) => {
  const uses = new Map();

  for (const duel of duels) {
    for (const use of duel.skillUses) {
      uses.set(
        use.name,
        (uses.get(use.name) ?? 0) + use.perMove / duels.length,
      );
    }
  }

  return [...uses].sort((a, b) => b[1] - a[1]);
};

const renderTeamFight = (team) =>
  team
    ? `<div class="kpis">
        ${kpi("Walka 6 na 6", percent(team.winRate), "wygrane drużyny z tobą zamiast typowego łowcy")}
        ${kpi("Przeżywasz walkę drużynową", percent(team.survivalRate))}
        ${kpi("Twój udział w obrażeniach drużyny", percent(team.damageShare))}
      </div>`
    : "";

const renderSimulation = (build) => {
  const { duels, team } = build.simulation;
  const group = lastResponse.goal === "group";

  const reference = new Map(
    lastResponse.referenceSimulation.duels.map((duel) => [
      duel.profession,
      duel.winRate,
    ]),
  );

  const rows = duels
    .map(
      (duel) => `<tr>
        <td>${escape(duel.profession)}</td>
        <td class="${winClass(duel.winRate)}">${percent(duel.winRate)}</td>
        <td>${percent(duel.drawRate)}</td>
        <td>${number(duel.myMoves, 1)} : ${number(duel.theirMoves, 1)}</td>
        <td>${percent(duel.myHpLeft)}</td>
        <td>${percent(duel.theirHpLeft)}</td>
        ${group ? `<td>${percent(reference.get(duel.profession) ?? 0)}</td>` : ""}
      </tr>`,
    )
    .join("");

  const uses = averageSkillUses(duels)
    .map(
      ([name, perMove]) =>
        `<span class="skill">${escape(name)} <b>${percent(perMove)}</b></span>`,
    )
    .join("");

  return `<p class="section-lead">${lastResponse.simulationRuns} losowych walk na przeciwnika, tura po turze: kolejność według czasu ataku, uniki, bloki, krytyki, przebicia, niszczenie pancerza, trucizna, głęboka rana, leczenie i umiejętności aktywne z energią, odnowieniem i punktami kombinacji. Remis to walka, która dobiła do limitu 75 tur na gracza.</p>
    ${renderTeamFight(team)}
    <div class="table-wrap"><table class="compare">
      <thead><tr><th>Przeciwnik</th><th>Wygrane</th><th>Remisy</th><th>Ruchy (ty : on)</th><th>Twoje HP na koniec</th><th>Jego HP na koniec</th>${group ? "<th>Typowy łowca-heroik</th>" : ""}</tr></thead>
      <tbody>${rows}</tbody></table></div>
    ${uses ? `<p class="section-lead" style="margin-top:12px">Jak często symulacja używa twoich umiejętności aktywnych (na ruch):</p><div class="skill-list">${uses}</div>` : ""}`;
};

const renderOpponentBuild = () => {
  const opponent = lastResponse.opponents[0];

  if (!opponent || lastResponse.goal !== "duel") return "";
  const s = opponent.stats;

  return `<h2 class="section-title">Zestaw przeciwnika (${escape(opponent.profession)})</h2>
    <p class="section-lead">Przeciwnik też dobrał zestaw i umiejętności przeciw tobie, a twój zestaw jest odpowiedzią na jego. Broń: ${opponent.weapons.map(escape).join(" + ")}.</p>
    <div class="kpis">
      ${kpi("Życie", number(s.hp))}
      ${kpi("Szybkość ataku", number(s.attackSpeed, 2))}
      ${kpi("Unik", `${number(s.evadeChance, 1)}%`)}
      ${kpi("Blok", `${number(s.blockChance, 1)}%`)}
      ${kpi("Pancerz", number(s.armor))}
      ${kpi("Odporność na truciznę", `${number(s.poisonResistance, 0)}%`)}
      ${kpi("Leczenie", number(s.healing))}
    </div>`;
};

const renderBuild = (build) => {
  const me = build.me;
  const group = lastResponse.goal === "group";

  const duels = build.simulation.duels;

  const averageWin =
    duels.reduce((total, duel) => total + duel.winRate, 0) / duels.length;

  const headline = group
    ? kpi(
        "Wynik vs typowy łowca-heroik",
        `${number(build.advantage, 2)}×`,
        build.path === "free"
          ? "najlepszy zestaw według modelu"
          : `${number(build.costVersusBest * 100, 1)}% słabszy niż najlepszy według modelu`,
      )
    : kpi(
        "Przewaga w pojedynku",
        `${number(build.perOpponent[0].theirTimeToKill / build.perOpponent[0].myTimeToKill, 2)}×`,
        "tyle razy dłużej przeciwnik potrzebuje na zabicie ciebie niż ty na zabicie jego",
      );

  return `
    <div class="chips">
      <span class="chip">${number(lastResponse.candidateCount)} kandydatów po filtrach · ${number(lastResponse.elapsedMs / 1000, 1)} s</span>
    </div>
    <div class="kpis">
      <div class="kpi hero">${headline.slice('<div class="kpi">'.length)}
      ${kpi(group ? "Średnio wygranych pojedynków" : "Wygrane w symulacji", percent(averageWin), group ? "przeciw najlepszym zestawom 6 profesji" : null)}
      ${kpi("Szybkość ataku", number(me.attackSpeed, 2))}
      ${kpi("Obrażenia za trafienie", number(me.damage))}
      ${kpi("Cios krytyczny", `${number(me.critChance, 1)}%`)}
      ${kpi("Siła krytyka", `${number(me.critValue, 0)}%`)}
      ${kpi("Przebicie", `${number(me.pierce, 0)}%`)}
      ${kpi("Życie", number(me.hp))}
      ${kpi("Unik", `${number(me.evadeChance, 1)}%`)}
      ${kpi("Pancerz", number(me.armor))}
      ${kpi("Leczenie", number(me.healing))}
      ${kpi("Odporność na truciznę", `${number(me.poisonResistance, 0)}%`)}
    </div>
    <h2 class="section-title">Co się najbardziej opłaca dołożyć</h2>
    <p class="section-lead">Ile zyskasz, dokładając do tego zestawu jeden typowy bonus danej statystyki z przedmiotu na twoim poziomie. Liczone z tego samego modelu walki, którym wybierany jest zestaw.</p>
    ${renderStatValues(build.statValues)}
    <h2 class="section-title">Umiejętności (${build.skillPoints} punktów)</h2>
    ${renderSkills(build)}
    <h2 class="section-title">Symulacja walk</h2>
    ${renderSimulation(build)}
    <h2 class="section-title">${group ? "Model analityczny: przeciw każdej profesji" : "Model analityczny: pojedynek"}</h2>
    <p class="section-lead">Szybka ocena, którą solver wstępnie wybiera zestaw, zanim sprawdzi go symulacją. Czas w umownych jednostkach. ${group ? "W ustawkach liczą się obrażenia zadane, zanim zginiesz, a przeżywalność tylko do typowej długości walki." : ""}</p>
    ${renderOpponents(build)}
    ${renderOpponentBuild()}
    <h2 class="section-title">Zestaw</h2>
    <div class="slots">${build.slots.map(renderSlot).join("")}</div>`;
};

const render = () => {
  const { builds } = lastResponse;
  const build = builds[Math.min(selectedBuild, builds.length - 1)];

  const tabs =
    builds.length > 1
      ? `<div class="tabs" role="tablist" aria-label="Warianty zestawu">${builds
          .map(
            (candidate, index) =>
              `<button type="button" class="tab" role="tab" aria-selected="${candidate === build}" data-build="${index}">${escape(candidate.label)}</button>`,
          )
          .join("")}</div>`
      : "";

  result.innerHTML = `
    ${tabs}
    ${renderBuild(build)}
    <ul class="footnote">
      <li>Model walki opiera się na wzorach z pomocy Margonem i na liczeniu statystyk z kreatora zestawów w wiki. To nie jest wynik z prawdziwych walk.</li>
      <li>Solver wybiera zestaw modelem analitycznym, a potem symulacją walk dobiera umiejętności aktywne i sprawdza najbliższe alternatywy przedmiotów.</li>
      <li>Bonusy legendarne, ulepszenia przedmiotów i część umiejętności aktywnych (np. oczyszczanie, bandażowanie, Piętno bestii) nie są liczone. Przekreślone staty na przedmiotach model pomija.</li>
      <li>Porównanie z battlelogiem: długość walk łowcy z każdą profesją zgadza się z prawdziwymi walkami w granicach ok. 20%, ale prawdziwe postacie mają 30–50% więcej życia (ulepszenia), więc leczenie wychodzi tu za mocne.</li>
      <li>Przeciwnicy to najlepsze zestawy każdej profesji według tego samego modelu, dobrane z wszystkich przedmiotów bez filtrów.</li>
      <li>Filtry dotyczą tylko twojego zestawu. Przedmiot przechodzi filtr źródła, jeśli wypada z przynajmniej jednego zaznaczonego źródła.</li>
    </ul>`;

  for (const tab of result.querySelectorAll("[data-build]")) {
    tab.addEventListener("click", () => {
      selectedBuild = Number(tab.dataset.build);
      render();
      result.querySelector(`[data-build="${selectedBuild}"]`)?.focus();
    });
  }
};

const solve = async () => {
  if (!form.reportValidity()) return;

  submit.disabled = true;
  submit.textContent = "Liczę…";

  try {
    const params = new URLSearchParams(new FormData(form));
    const response = await fetch(`/api/solve?${params}`);
    const data = await response.json();

    if (!response.ok) {
      lastResponse = null;
      result.innerHTML = `<div class="error">${escape(data.error)}</div>`;
    } else {
      lastResponse = data;
      render();
    }
  } catch (error) {
    result.innerHTML = `<div class="error">Nie udało się policzyć: ${escape(error.message)}</div>`;
  } finally {
    submit.disabled = false;
    submit.textContent = "Policz zestaw";
  }
};

const syncOpponentField = () => {
  opponentField.hidden = goal.value !== "duel";
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  solve();
});

form.addEventListener("change", (event) => {
  if (event.target.name === "goal") syncOpponentField();

  if (["checkbox", "select-one"].includes(event.target.type)) solve();
});

syncOpponentField();

solve();
