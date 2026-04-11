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
