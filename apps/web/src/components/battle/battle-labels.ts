export type BattleLabels = {
  header: {
    title: string;
    copyLink: string;
    hide: string;
    share: string;
    delete: string;
    deleteConfirmTitle: string;
    deleteConfirmDescription: string;
    cancel: string;
    deleteBattle: string;
  };
  teams: {
    userTeam: string;
    enemyTeam: string;
  };
  metadata: {
    startTime: string;
    duration: string;
    battleType: string;
    public: string;
    private: string;
    publicTooltip: string;
    privateTooltip: string;
  };
};

export const DEFAULT_BATTLE_LABELS: BattleLabels = {
  header: {
    title: "Przegląd walki",
    copyLink: "Skopiuj link",
    hide: "Ukryj",
    share: "Udostępnij",
    delete: "Usuń",
    deleteConfirmTitle: "Czy na pewno chcesz usunąć tę walkę?",
    deleteConfirmDescription:
      "Ta akcja jest nieodwracalna. Walka zostanie całkowicie usunięta z systemu i nie będzie można jej przywrócić. Nie będzie również brana podczas obliczania statystyk.",
    cancel: "Anuluj",
    deleteBattle: "Usuń walkę",
  },
  teams: {
    userTeam: "Twoja drużyna",
    enemyTeam: "Przeciwnicy",
  },
  metadata: {
    startTime: "Data i godzina rozpoczęcia walki",
    duration: "Czas trwania walki",
    battleType: "Typ walki",
    public: "Publiczna",
    private: "Prywatna",
    publicTooltip:
      "Walka jest publiczna - może być przeglądana przez osoby posiadające link",
    privateTooltip: "Walka jest prywatna - tylko Ty możesz ją zobaczyć",
  },
};
